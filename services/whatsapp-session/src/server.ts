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
  pairingCode?: string;
  pairingPhone?: string;
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

/* ---------------- Message / contact sync helpers ---------------- */

function jidToPhone(jid: string | null | undefined): string | null {
  if (!jid) return null;
  const bare = jid.split("@")[0];
  const phone = bare.split(":")[0];
  return phone || null;
}

function isIgnorableJid(jid: string | null | undefined): boolean {
  if (!jid) return true;
  if (jid === "status@broadcast") return true;
  if (jid.endsWith("@newsletter")) return true;
  if (jid.endsWith("@broadcast")) return true;
  return false;
}

function extractMessageContent(
  message: Record<string, any> | null | undefined,
): { type: string; text: string | null; mediaUrl: string | null } | null {
  if (!message) return null;
  if (message.protocolMessage || message.reactionMessage || message.senderKeyDistributionMessage) {
    return null;
  }
  if (typeof message.conversation === "string" && message.conversation.length) {
    return { type: "text", text: message.conversation, mediaUrl: null };
  }
  if (message.extendedTextMessage?.text) {
    return { type: "text", text: message.extendedTextMessage.text, mediaUrl: null };
  }
  if (message.imageMessage) {
    return { type: "image", text: message.imageMessage.caption ?? null, mediaUrl: null };
  }
  if (message.videoMessage) {
    return { type: "video", text: message.videoMessage.caption ?? null, mediaUrl: null };
  }
  if (message.audioMessage) {
    return { type: "audio", text: null, mediaUrl: null };
  }
  if (message.documentMessage) {
    const cap = message.documentMessage.caption ?? message.documentMessage.fileName ?? null;
    return { type: "document", text: cap, mediaUrl: null };
  }
  if (message.documentWithCaptionMessage?.message?.documentMessage) {
    const dm = message.documentWithCaptionMessage.message.documentMessage;
    return { type: "document", text: dm.caption ?? dm.fileName ?? null, mediaUrl: null };
  }
  if (message.stickerMessage) {
    return { type: "sticker", text: null, mediaUrl: null };
  }
  return null;
}

async function upsertContact(
  clientId: string,
  slot: number,
  phone: string,
  patch: {
    display_name?: string | null;
    avatar_url?: string | null;
    last_message_preview?: string | null;
    last_message_at?: string | null;
    incrementUnread?: boolean;
  },
  logger: pino.Logger,
): Promise<string | null> {
  if (!supabase) return null;
  const { data: existing, error: selErr } = await supabase
    .from("whatsapp_contacts")
    .select("id, unread_count, display_name, avatar_url")
    .eq("client_id", clientId)
    .eq("device_slot", slot)
    .eq("phone", phone)
    .maybeSingle();
  if (selErr) {
    logger.error({ error: selErr.message }, "contact select failed");
    return null;
  }

  if (existing) {
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (patch.display_name && !existing.display_name) update.display_name = patch.display_name;
    if (patch.avatar_url && !existing.avatar_url) update.avatar_url = patch.avatar_url;
    if (patch.last_message_preview !== undefined)
      update.last_message_preview = patch.last_message_preview;
    if (patch.last_message_at !== undefined) update.last_message_at = patch.last_message_at;
    if (patch.incrementUnread) update.unread_count = (existing.unread_count ?? 0) + 1;
    const { error: updErr } = await supabase
      .from("whatsapp_contacts")
      .update(update)
      .eq("id", existing.id);
    if (updErr) {
      logger.error({ error: updErr.message }, "contact update failed");
      return existing.id;
    }
    log.info({ phone, slot }, "[supabase] contact saved");
    return existing.id;
  }

  const { data: inserted, error: insErr } = await supabase
    .from("whatsapp_contacts")
    .insert({
      client_id: clientId,
      device_slot: slot,
      phone,
      display_name: patch.display_name ?? null,
      avatar_url: patch.avatar_url ?? null,
      last_message_preview: patch.last_message_preview ?? null,
      last_message_at: patch.last_message_at ?? null,
      unread_count: patch.incrementUnread ? 1 : 0,
    })
    .select("id")
    .single();
  if (insErr) {
    logger.error({ error: insErr.message }, "contact insert failed");
    return null;
  }
  log.info({ phone, slot }, "[supabase] contact saved");
  return inserted.id;
}

async function handleIncomingMessage(
  clientId: string,
  slot: number,
  m: any,
  logger: pino.Logger,
) {
  const remoteJid: string | undefined = m?.key?.remoteJid;
  if (isIgnorableJid(remoteJid)) return;
  if (!m?.message) return;

  const content = extractMessageContent(m.message);
  if (!content) return;
  if (content.type === "text" && !content.text) return;

  const fromMe = Boolean(m.key?.fromMe);
  const phone = jidToPhone(remoteJid);
  if (!phone) return;

  const senderName: string | null = m.pushName ?? null;
  const ts =
    typeof m.messageTimestamp === "number"
      ? m.messageTimestamp
      : Number(m.messageTimestamp ?? 0);
  const sentAt = ts ? new Date(ts * 1000).toISOString() : new Date().toISOString();
  const preview =
    content.text ??
    (content.type === "image"
      ? "📷 Image"
      : content.type === "video"
        ? "🎥 Video"
        : content.type === "audio"
          ? "🎤 Audio"
          : content.type === "document"
            ? "📄 Document"
            : content.type === "sticker"
              ? "🩷 Sticker"
              : "");

  log.info({ phone, fromMe, type: content.type }, "[baileys] new message");
