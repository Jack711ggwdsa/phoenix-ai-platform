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
const SESSIONS_ROOT = path.resolve(__dirname, "../sessions");

await fs.mkdir(SESSIONS_ROOT, { recursive: true });

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
  status: "pending" | "connecting" | "connected" | "disconnected" | "session_expired";
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

async function startWhatsAppSession(clientId: string, slot: number): Promise<void> {
  const k = key(clientId, "whatsapp", slot);
  const existing = sessions.get(k);
  if (existing?.status === "connected") return; // already live

  const authDir = path.join(SESSIONS_ROOT, clientId, "whatsapp", `device-${slot}`);
  await fs.mkdir(authDir, { recursive: true });
  const { state, saveCreds } = await useMultiFileAuthState(authDir);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    logger: log.child({ slot, clientId }),
  });

  const entry: SessionEntry = { sock, status: "pending" };
  sessions.set(k, entry);

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      const expiresAt = new Date(Date.now() + 20_000).toISOString();
      entry.qr = qr;
      entry.qrExpiresAt = expiresAt;
      entry.status = "pending";
      io.to(room(clientId, "whatsapp")).emit("qr-update", {
        device_slot: slot,
        qr_code: qr,
        qr_expires_at: expiresAt,
      });
      await mirrorToSupabase(clientId, "whatsapp", slot, {
        connection_status: "pending",
        qr_code: qr,
        qr_expires_at: expiresAt,
      });
    }

    if (connection === "open") {
      entry.status = "connected";
      const me = sock.user;
      const deviceName = me?.name ?? me?.id ?? null;
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
      const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
      const loggedOut = statusCode === DisconnectReason.loggedOut;

      if (loggedOut) {
        entry.status = "session_expired";
        io.to(room(clientId, "whatsapp")).emit("session-expired", { device_slot: slot });
        await mirrorToSupabase(clientId, "whatsapp", slot, {
          connection_status: "session_expired",
          qr_code: null,
          qr_expires_at: null,
        });
        sessions.delete(k);
        await fs.rm(authDir, { recursive: true, force: true });
      } else {
        entry.status = "disconnected";
        io.to(room(clientId, "whatsapp")).emit("reconnecting", {
          device_slot: slot,
          attempt: 1,
        });
        // Reconnect with same auth state.
        setTimeout(() => {
          void startWhatsAppSession(clientId, slot).catch((err) =>
            log.error({ err }, "Reconnect failed"),
          );
        }, 1_500);
      }
    }
  });
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

app.get("/health", (_req, res) =>
  res.json({ ok: true, sessions: sessions.size, uptime: process.uptime() }),
);

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
    }
  }
});

server.listen(PORT, () => {
  log.info(`Phoenix WhatsApp session service listening on :${PORT}`);
});
