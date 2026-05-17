# Phoenix WhatsApp Session Service — Deployment Guide

This is the **external Node.js Baileys backend** required by the Phoenix CRM
"Connect to Phoenix Inbox" flow. It cannot run inside the Lovable Worker
runtime — it must live on a long-lived Node host with a persistent disk.

It exposes:

- `GET  /health` → `{ ok, sessions, uptime }`
- `POST /api/start-session/whatsapp/:deviceSlot`
  body: `{ "client_id": "<uuid>" }` — boots a Baileys session for that slot.
- `POST /api/stop-session/whatsapp/:deviceSlot`
  body: `{ "client_id": "<uuid>" }` — logs out and clears auth files.
- Socket.IO (same origin) — connect with
  `?clientId=<uuid>&platform=whatsapp`. Events:
  - `qr-update` — `{ device_slot, qr_code, qr_expires_at }`
  - `session-connected` — `{ device_slot, device_name }`
  - `session-disconnected` — `{ device_slot }`
  - `session-expired` — `{ device_slot }`
  - `connection-error` — `{ device_slot, message }`

The service writes status changes directly into the Supabase
`device_connections` table using the service-role key, so the Phoenix UI
updates in realtime even without the websocket.

---

## 1. Environment variables (on the host)

```
PORT=8787
SESSION_SERVICE_TOKEN=<long random string>
SUPABASE_URL=https://<your-project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key from Lovable Cloud>
CORS_ORIGIN=https://phoenix-spark-suite.lovable.app
```

The `SESSION_SERVICE_TOKEN` is a shared secret. Phoenix server functions send
it as `Authorization: Bearer <token>` when calling `/api/start-session`.

---

## 2. Deploy on Railway

1. Create a new Railway project → **Deploy from GitHub repo** → pick this repo
   and set the service root to `services/whatsapp-session`.
2. Railway auto-detects Node. Build command: `npm install && npm run build`.
   Start command: `npm start`.
3. Open **Variables** and paste the five env vars above.
4. Open **Settings → Volumes** → create a volume mounted at `/app/sessions`
   (size 1 GB is plenty). This is **required** — without it every restart
   forces all devices to re-scan.
5. Open **Settings → Networking** → **Generate Domain**. Copy the public URL
   (e.g. `https://phoenix-wa-production.up.railway.app`).

---

## 3. Deploy on Render

1. **New → Web Service** → connect this repo → root directory
   `services/whatsapp-session`.
2. Runtime: Node. Build: `npm install && npm run build`. Start: `npm start`.
3. **Environment** tab → add the same five env vars.
4. **Disks** → add a disk mounted at `/opt/render/project/src/sessions`
   (1 GB). Then set env var
   `SESSIONS_DIR=/opt/render/project/src/sessions` (the service falls back
   to `../sessions` if unset, which only works on Railway/Docker).
5. Deploy. Copy the public URL from the service header.

---

## 4. Deploy with Docker (any VPS)

```bash
docker build -t phoenix-wa services/whatsapp-session
docker run -d --name phoenix-wa \
  -p 8787:8787 \
  -v phoenix-wa-sessions:/app/sessions \
  --env-file services/whatsapp-session/.env \
  phoenix-wa
```

Front it with nginx / Caddy + HTTPS. The Lovable frontend requires HTTPS.

---

## 5. Verify

```bash
curl https://<your-host>/health
# → {"ok":true,"sessions":0,"uptime":12.3}
```

---

## 6. Wire it into Lovable

In the Lovable project (this repo), add:

**Project env (build-time, public — used by the browser for Socket.IO):**

```
VITE_SESSION_SERVICE_URL=https://<your-host>
```

**Lovable Cloud → Secrets (server-only — used by server functions):**

```
SESSION_SERVICE_URL=https://<your-host>
SESSION_SERVICE_DISCONNECT_URL=https://<your-host>
SESSION_SERVICE_TOKEN=<same SESSION_SERVICE_TOKEN as above>
```

Republish. Open the WhatsApp Workspace — the "Phoenix Backend" status pill
should flip from "Not Connected" to "Configured", and **Connect to Phoenix
Inbox** becomes enabled.

---

## 7. End-to-end flow

1. User clicks **Connect to Phoenix Inbox** on Device 1.
2. Phoenix server fn → `POST /api/start-session/whatsapp/device-1`
   with `Authorization: Bearer <token>` and `{ client_id }`.
3. Baileys starts → emits real `qr-update` over Socket.IO and writes the QR
   into `device_connections.qr_code`.
4. Phoenix UI renders the QR (modal). User scans with their phone.
5. Baileys emits `session-connected` → service writes
   `connection_status='connected'` to Supabase.
6. Phoenix UI flips the device to **Connected** and enables **Open Phoenix
   Inbox**. Incoming messages from WhatsApp now sync into
   `whatsapp_contacts` / `whatsapp_messages` (extend `server.ts`
   `messages.upsert` handler — TODO marker).

If the device disconnects, the service auto-reconnects using the persisted
auth state. The QR is only required on first link or after logout.
