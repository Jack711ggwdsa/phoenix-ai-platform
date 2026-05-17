# Phoenix WhatsApp Session Service

Standalone Node.js service that hosts **real WhatsApp Web sessions** using
[Baileys](https://github.com/WhiskeySockets/Baileys), generates QR codes,
keeps each device session authenticated, and streams events to the Phoenix
CRM frontend via Socket.IO.

> ⚠️ This service **must** run on a long-lived Node host
> (Railway / Render / Fly / VPS / Docker). It cannot run inside the Lovable
> Worker runtime because Baileys keeps a persistent WebSocket connection per
> device session.

## What it exposes

### HTTP

`POST /api/start-session/whatsapp/device-1`

Body: `{ "client_id": "<client-uuid>" }`. Starts (or restarts) a Baileys
session for the slot. Writes the QR code into the backend `device_connections.qr_code`
and broadcasts a `qr-update` Socket.IO event.

`POST /api/stop-session/whatsapp/device-1`

Body: `{ "client_id": "<client-uuid>" }`. Logs out the device, clears local
session files, and sets status `empty` in the backend.

### Socket.IO

Clients connect with `?clientId=<uuid>&platform=whatsapp` and receive:

- `qr-update`         — `{ device_slot, qr_code, qr_expires_at }`
- `session-connected` — `{ device_slot, device_name }`
- `session-disconnected` — `{ device_slot }`
- `session-expired`   — `{ device_slot }`
- `reconnecting`      — `{ device_slot, attempt }`

## Session storage

Each slot gets an isolated auth folder:

```
sessions/
  <clientId>/
    whatsapp/
      device-1/
      device-2/
      ...
```

These folders contain the multi-file Baileys auth state. **Persist them on a
disk volume** (Railway/Render persistent disk, Fly volume, or a bind-mounted
Docker volume) — otherwise every restart forces a fresh QR scan.

## Environment

```
PORT=8787
SESSION_SERVICE_TOKEN=<shared secret with the Lovable backend>
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
CORS_ORIGIN=https://<your-app>.lovable.app
```

## Wire-up in the Lovable app

Set these env vars in **Lovable Cloud → Secrets** (server-only):

- `SESSION_SERVICE_URL`         = `https://<your-host>`
- `SESSION_SERVICE_DISCONNECT_URL` = `https://<your-host>`
- `SESSION_SERVICE_TOKEN`       = same shared secret as above

And in the Lovable project env (build-time, public):

- `VITE_SESSION_SERVICE_URL` = `https://<your-host>`

The frontend will automatically open a Socket.IO connection and receive live
QR + session events. If `VITE_SESSION_SERVICE_URL` is unset, the UI falls
back to Supabase Realtime updates written by an n8n workflow.

## Local dev

```
cp .env.example .env
bun install   # or npm install
bun run dev
```
