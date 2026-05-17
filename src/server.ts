/**
 * Phoenix WhatsApp Session Service
 * ---------------------------------
 *
 * Standalone Node.js daemon. Hosts real Baileys sessions for multi-device
 * WhatsApp pairing, persists auth state per slot, broadcasts live events to
 * the Lovable frontend over Socket.IO, and mirrors status into the Supabase
 * `device_connections` table.
 *
 * Run with:  bun run dev  (or)  npm run dev
 *
 * Lovable's Worker runtime cannot host Baileys — deploy this service on a
 * long-lived Node host (Railway, Render, Fly, Docker on a VPS). See README.
 */
import "dotenv/config";
import express from "express";
import cors from "cors";
import http from "node:http";
import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { Server as SocketServer } from "socket.io";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import pino from "pino";
import {
  default as makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";

const log = pino({ level: process.env.LOG_LEVEL ?? "info" });

const HOST = process.env.HOST ?? "0.0.0.0";
const PORT = Number(process.env.PORT ?? 8787);
const SHARED_TOKEN = process.env.SESSION_SERVICE_TOKEN ?? "";
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  log.warn("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not configured — Supabase mirroring disabled.");
}

const supabase =
  SUPABASE_URL && SUPABASE_SERVICE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SESSIONS_ROOT = path.resolve(process.env.SESSIONS_DIR ?? path.join(__dirname, "../sessions"));

await fs.mkdir(SESSIONS_ROOT, { recursive: true });
log.info({ sessionsRoot: SESSIONS_ROOT }, "Ensured WhatsApp session storage directory");

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN ?? "*" }));
app.use(express.json());

const server = http.createServer(app);
const io = new SocketServer(server, {
  cors: { origin: process.env.CORS_ORIGIN ?? "*" },
});

type Platform = "whatsapp";
type SessionKey = `${string}:${Platform}:${number}`;

interface SessionEntry {
  sock: ReturnType<typeof makeWASocket>;
  qr?: string;
  qrExpiresAt?: string;
  latestQrTimestamp?: string;
  deviceName?: string | null;
  lastError?: string;
  reconnectAttempts: number;
  authDir: string;
  status: "pending" | "connecting" | "connected" | "disconnected" | "session_expired" | "error";
}

const sessions = new Map<SessionKey, SessionEntry>();

function room(clientId: string, platform: Platform): string {
  return `${clientId}:${platform}`;
}

function key(clientId: string, platform: Platform, slot: number): SessionKey {
  return `${clientId}:${platform}:${slot}`;
}

async function mirrorToSupabase(
  clientId: string,
  platform: Platform,
  slot: number,
  patch: Record<string, unknown>,
) {
  if (!supabase) return;
  const { error } = await supabase
    .from("device_connections")
    .upsert(
      {
        client_id: clientId,
        platform,
        device_slot: slot,
        ...patch,
      },
      { onConflict: "client_id,platform,device_slot" },
    );
  if (error) log.error({ err: error }, "Failed to mirror to Supabase");
}

function summarizeError(err: unknown): string {
  if (err instanceof Error) return err.stack ?? err.message;
  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

function getLatestQrTimestamp(): string | null {
  return [...sessions.values()]
    .map((entry) => entry.latestQrTimestamp)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1) ?? null;
}

function getBaileysConnectionState(): string {
  const statuses = [...sessions.values()].map((entry) => entry.status);
  if (statuses.some((status) => status === "connected")) return "connected";
  if (statuses.some((status) => status === "pending" || status === "connecting")) return "connecting";
  if (statuses.some((status) => status === "disconnected")) return "disconnected";
  if (statuses.some((status) => status === "session_expired")) return "session_expired";
  if (statuses.some((status) => status === "error")) return "error";
  return "idle";
}

function emitQrUpdate(clientId: string, slot: number, qr: string, expiresAt: string) {
  io.to(room(clientId, "whatsapp")).emit("qr-update", {
    device_slot: slot,
    qr_code: qr,
    qr_expires_at: expiresAt,
  });
}

function emitConnectionError(clientId: string, slot: number, message: string) {
  io.to(room(clientId, "whatsapp")).emit("connection-error", {
    device_slot: slot,
    message,
  });
}

async function loadAuthStateWithRetry(authDir: string) {
  await fs.mkdir(authDir, { recursive: true });
  try {
    return await useMultiFileAuthState(authDir);
  } catch (err) {
    const message = summarizeError(err);
    if (/ENOENT|no such file or directory/i.test(message)) {
      log.warn({ authDir, message }, "Auth directory was missing during Baileys init; recreating");
      await fs.mkdir(authDir, { recursive: true });
      return await useMultiFileAuthState(authDir);
    }
    throw err;
  }
}

async function startWhatsAppSession(clientId: string, slot: number, reconnectAttempt = 0): Promise<void> {
  const k = key(clientId, "whatsapp", slot);
  const existing = sessions.get(k);
  if (existing?.status === "connected") return;
  if ((existing?.status === "pending" || existing?.status === "connecting") && existing.qr && existing.qrExpiresAt) {
    emitQrUpdate(clientId, slot, existing.qr, existing.qrExpiresAt);
    return;
  }

  const authDir = path.join(SESSIONS_ROOT, clientId, "whatsapp", `device-${slot}`);
  const logger = log.child({ slot, clientId, authDir, area: "baileys" });

  try {
    logger.info({ reconnectAttempt }, "Starting WhatsApp session");
    const { state, saveCreds } = await loadAuthStateWithRetry(authDir);
    const { version, isLatest } = await fetchLatestBaileysVersion();
    logger.info({ version, isLatest }, "Fetched Baileys version");

    const sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false,
      browser: ["Phoenix CRM", "Chrome", "1.0.0"],
      syncFullHistory: false,
      markOnlineOnConnect: false,
      logger,
    });

    const entry: SessionEntry = {
      sock,
      status: "connecting",
      reconnectAttempts: reconnectAttempt,
      authDir,
    };
    sessions.set(k, entry);

    sock.ev.on("creds.update", () => {
      void saveCreds().catch((err) => {
        logger.error({ error: summarizeError(err) }, "Failed to persist Baileys credentials");
      });
    });

    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;
      const disconnectError = lastDisconnect?.error;
      const disconnectMessage = disconnectError ? summarizeError(disconnectError) : undefined;
      const statusCode = (disconnectError as Boom | undefined)?.output?.statusCode;

      logger.info(
        {
          connection,
          hasQr: Boolean(qr),
          statusCode,
          disconnectMessage,
        },
        "Baileys connection.update",
      );

      if (connection === "connecting") {
        entry.status = "connecting";
      }

      if (qr) {
        const generatedAt = new Date().toISOString();
        const expiresAt = new Date(Date.now() + 20_000).toISOString();
        entry.qr = qr;
        entry.qrExpiresAt = expiresAt;
        entry.latestQrTimestamp = generatedAt;
        entry.status = "pending";
        entry.lastError = undefined;
        logger.info({ generatedAt, expiresAt }, "Generated WhatsApp QR code");
        emitQrUpdate(clientId, slot, qr, expiresAt);
        await mirrorToSupabase(clientId, "whatsapp", slot, {
          connection_status: "pending",
          qr_code: qr,
          qr_expires_at: expiresAt,
          session_health: "qr_ready",
        });
      }

      if (connection === "open") {
        entry.status = "connected";
        entry.qr = undefined;
        entry.qrExpiresAt = undefined;
        entry.lastError = undefined;
        entry.reconnectAttempts = 0;
        const me = sock.user;
        const deviceName = me?.name ?? me?.id ?? null;
        entry.deviceName = deviceName;
        logger.info({ deviceName }, "WhatsApp session connected");
        io.to(room(clientId, "whatsapp")).emit("session-connected", {
          device_slot: slot,
          device_name: deviceName,
        });
        await mirrorToSupabase(clientId, "whatsapp", slot, {
          connection_status: "connected",
          qr_code: null,
          qr_expires_at: null,
          last_connected_at: new Date().toISOString(),
          device_name: deviceName,
          session_health: "ok",
        });
      }

      if (connection === "close") {
        const loggedOut = statusCode === DisconnectReason.loggedOut;
        const reason = disconnectMessage ?? `Baileys closed with status ${statusCode ?? "unknown"}`;

        logger.error({ statusCode, reason, loggedOut }, "Baileys connection closed");

        if (loggedOut) {
          entry.status = "session_expired";
          entry.lastError = reason;
          io.to(room(clientId, "whatsapp")).emit("session-expired", { device_slot: slot });
          await mirrorToSupabase(clientId, "whatsapp", slot, {
            connection_status: "session_expired",
            qr_code: null,
            qr_expires_at: null,
            session_health: "session_expired",
          });
          sessions.delete(k);
          await fs.rm(authDir, { recursive: true, force: true });
          return;
        }

        entry.status = "disconnected";
        entry.lastError = reason;
        entry.reconnectAttempts += 1;
        const attempt = entry.reconnectAttempts;
        const delayMs = Math.min(1_000 * attempt, 5_000);
        io.to(room(clientId, "whatsapp")).emit("session-disconnected", { device_slot: slot });
        io.to(room(clientId, "whatsapp")).emit("reconnecting", {
          device_slot: slot,
          attempt,
        });
        await mirrorToSupabase(clientId, "whatsapp", slot, {
          connection_status: "disconnected",
          session_health: reason.slice(0, 240),
        });
        setTimeout(() => {
          void startWhatsAppSession(clientId, slot, attempt).catch((err) => {
            logger.error({ error: summarizeError(err), attempt }, "Reconnect failed");
          });
        }, delayMs);
      }
    });
  } catch (err) {
    const message = summarizeError(err);
    log.error({ clientId, slot, authDir, error: message }, "Failed to start WhatsApp session");
    emitConnectionError(clientId, slot, message);
    await mirrorToSupabase(clientId, "whatsapp", slot, {
      connection_status: "disconnected",
      qr_code: null,
      qr_expires_at: null,
      session_health: message.slice(0, 240),
    });
    sessions.delete(k);
    throw err;
  }
}

async function stopWhatsAppSession(clientId: string, slot: number): Promise<void> {
  const k = key(clientId, "whatsapp", slot);
  const entry = sessions.get(k);
  if (entry) {
    try {
      await entry.sock.logout();
    } catch {
      // ignore
    }
    sessions.delete(k);
  }
  const authDir = path.join(SESSIONS_ROOT, clientId, "whatsapp", `device-${slot}`);
  await fs.rm(authDir, { recursive: true, force: true });
  io.to(room(clientId, "whatsapp")).emit("session-disconnected", { device_slot: slot });
  await mirrorToSupabase(clientId, "whatsapp", slot, {
    connection_status: "empty",
    qr_code: null,
    qr_expires_at: null,
    device_name: null,
    last_connected_at: null,
    session_health: null,
  });
}

/* ------------------------------- HTTP API -------------------------------- */

function checkAuth(req: express.Request, res: express.Response): boolean {
  if (!SHARED_TOKEN) return true;
  const header = req.headers.authorization;
  if (header === `Bearer ${SHARED_TOKEN}`) return true;
  res.status(401).json({ ok: false, error: "Unauthorized" });
  return false;
}

const startSchema = z.object({
  client_id: z.string().uuid(),
  platform: z.literal("whatsapp"),
  device_slot: z.number().int().min(1).max(5),
});

const routeParamsSchema = z.object({
  platform: z.literal("whatsapp"),
  deviceSlot: z.string().regex(/^device-[1-5]$/),
});

function getSocketConnectedCount(): number {
  return io.of("/").sockets.size;
}

app.get("/health", (_req, res) =>
  res.json({ ok: true, sessions: sessions.size, uptime: process.uptime(), port: PORT, host: HOST }),
);

// Runtime diagnostics endpoint — v2 (force resync to GitHub)
app.get("/debug", (_req, res) => {
  res.json({
    ok: true,
    version: "qr-runtime-fix-v2",
    timestamp: new Date().toISOString(),
    socket_connected_count: getSocketConnectedCount(),
    active_sessions: sessions.size,
    latest_qr_timestamp: getLatestQrTimestamp(),
    baileys_connection_state: getBaileysConnectionState(),
    sessions: [...sessions.entries()].map(([sessionKey, entry]) => ({
      session_key: sessionKey,
      status: entry.status,
      qr_expires_at: entry.qrExpiresAt ?? null,
      latest_qr_timestamp: entry.latestQrTimestamp ?? null,
      device_name: entry.deviceName ?? null,
      reconnect_attempts: entry.reconnectAttempts,
      last_error: entry.lastError ?? null,
      auth_dir: entry.authDir,
    })),
  });
});

app.post("/api/start-session", async (req, res) => {
  if (!checkAuth(req, res)) return;
  const parsed = startSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ ok: false, error: parsed.error.flatten() });
    return;
  }
  const { client_id, device_slot } = parsed.data;
  try {
    await startWhatsAppSession(client_id, device_slot);
    res.json({ ok: true });
  } catch (err) {
    log.error({ err }, "start-session failed");
    res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

app.post("/api/start-session/:platform/:deviceSlot", async (req, res) => {
  if (!checkAuth(req, res)) return;
  const routeParsed = routeParamsSchema.safeParse(req.params);
  const bodyParsed = z.object({ client_id: z.string().uuid() }).safeParse(req.body);
  if (!routeParsed.success || !bodyParsed.success) {
    res.status(400).json({
      ok: false,
      error: {
        params: routeParsed.success ? null : routeParsed.error.flatten(),
        body: bodyParsed.success ? null : bodyParsed.error.flatten(),
      },
    });
    return;
  }

  const slot = Number(routeParsed.data.deviceSlot.replace("device-", ""));
  try {
    await startWhatsAppSession(bodyParsed.data.client_id, slot);
    res.json({ ok: true });
  } catch (err) {
    log.error({ err }, "start-session route failed");
    res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

app.post("/api/stop-session", async (req, res) => {
  if (!checkAuth(req, res)) return;
  const parsed = startSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ ok: false, error: parsed.error.flatten() });
    return;
  }
  const { client_id, device_slot } = parsed.data;
  try {
    await stopWhatsAppSession(client_id, device_slot);
    res.json({ ok: true });
  } catch (err) {
    log.error({ err }, "stop-session failed");
    res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

app.post("/api/stop-session/:platform/:deviceSlot", async (req, res) => {
  if (!checkAuth(req, res)) return;
  const routeParsed = routeParamsSchema.safeParse(req.params);
  const bodyParsed = z.object({ client_id: z.string().uuid() }).safeParse(req.body);
  if (!routeParsed.success || !bodyParsed.success) {
    res.status(400).json({
      ok: false,
      error: {
        params: routeParsed.success ? null : routeParsed.error.flatten(),
        body: bodyParsed.success ? null : bodyParsed.error.flatten(),
      },
    });
    return;
  }

  const slot = Number(routeParsed.data.deviceSlot.replace("device-", ""));
  try {
    await stopWhatsAppSession(bodyParsed.data.client_id, slot);
    res.json({ ok: true });
  } catch (err) {
    log.error({ err }, "stop-session route failed");
    res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

/* ------------------------------ Socket.IO -------------------------------- */

io.on("connection", (socket) => {
  const clientId = String(socket.handshake.query.clientId ?? "");
  const platform = String(socket.handshake.query.platform ?? "whatsapp") as Platform;
  if (!clientId) {
    socket.disconnect(true);
    return;
  }
  log.info({ socketId: socket.id, clientId, platform, socketCount: getSocketConnectedCount() }, "Socket.IO client connected");
  socket.join(room(clientId, platform));

  // Replay current state for each known slot
  for (const [k, entry] of sessions) {
    const [cid, plat, slotStr] = k.split(":");
    if (cid !== clientId || plat !== platform) continue;
    const slot = Number(slotStr);
    if (entry.qr && entry.status === "pending") {
      socket.emit("qr-update", {
        device_slot: slot,
        qr_code: entry.qr,
        qr_expires_at: entry.qrExpiresAt,
      });
    } else if (entry.status === "connected") {
      socket.emit("session-connected", { device_slot: slot });
    } else if (entry.lastError) {
      socket.emit("connection-error", { device_slot: slot, message: entry.lastError });
    }
  }

  socket.on("disconnect", (reason) => {
    log.info({ socketId: socket.id, clientId, platform, reason, socketCount: getSocketConnectedCount() }, "Socket.IO client disconnected");
  });
});

process.on("unhandledRejection", (error) => {
  log.error({ error: summarizeError(error) }, "Unhandled promise rejection in session service");
});

process.on("uncaughtException", (error) => {
  log.fatal({ error: summarizeError(error) }, "Uncaught exception in session service");
});

server.listen(PORT, HOST, () => {
  log.info({ host: HOST, port: PORT }, "Phoenix WhatsApp session service listening");
});
