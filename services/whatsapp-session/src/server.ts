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
    return { pairingCode };
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
    version: "messages-sync-v1",
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

const pairingSchema = z.object({
  client_id: z.string().uuid(),
  device_slot: z.number().int().min(1).max(5),
  phone_number: z
    .string()
    .min(6)
    .max(20)
    .transform((v) => v.replace(/[^0-9]/g, "")),
});

app.post("/api/request-pairing-code", async (req, res) => {
  if (!checkAuth(req, res)) return;
  const parsed = pairingSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ ok: false, error: parsed.error.flatten() });
    return;
  }
  const { client_id, device_slot, phone_number } = parsed.data;
  if (!phone_number || phone_number.length < 6) {
    res.status(400).json({ ok: false, error: "Invalid phone_number" });
    return;
  }
  try {
    const result = await startWhatsAppSession(client_id, device_slot, 0, phone_number);
    if (!result.pairingCode) {
      res.status(500).json({ ok: false, error: "Pairing code was not generated" });
      return;
    }
    res.json({
      ok: true,
      pairing_code: result.pairingCode,
      phone_number,
    });
  } catch (err) {
    log.error({ err }, "request-pairing-code failed");
    res.status(500).json({ ok: false, error: (err as Error).message });
  }
});
