import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const PUBLIC_SESSION_SERVICE_URL = (import.meta.env.VITE_SESSION_SERVICE_URL as string | undefined)?.trim();

function buildSessionServiceUrl(baseUrl: string, path: string): string {
  if (baseUrl.includes("/api/start-session") || baseUrl.includes("/api/stop-session")) {
    return baseUrl;
  }

  return new URL(path, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`).toString();
}

const PLATFORMS = ["whatsapp", "messenger", "telegram", "instagram"] as const;

const sessionInput = z.object({
  platform: z.enum(PLATFORMS),
  deviceSlot: z.number().int().min(1).max(5),
});

type SessionInput = z.infer<typeof sessionInput>;

/**
 * Mark a slot as `pending`, clear any stale QR, and ask the configured
 * session service to start a real pairing flow.
 *
 * Resolution order for the outgoing URL:
 *   1. <PLATFORM>_SESSION_SERVICE_URL  (e.g. WHATSAPP_SESSION_SERVICE_URL)
 *   2. SESSION_SERVICE_URL             (generic Baileys/Express/Socket.IO host)
 *
 * Returns a structured result so the UI can show a precise reason on failure
 * instead of the generic "Failed to reach connection service".
 */
export const requestDeviceSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => sessionInput.parse(input))
  .handler(async ({ data, context }) => {
    const { platform, deviceSlot } = data as SessionInput;
    const { supabase, userId } = context;

    // Look up the calling user's client_id so the session service can scope auth.
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("client_id")
      .eq("id", userId)
      .maybeSingle();

    if (profileError || !profile?.client_id) {
      return {
        ok: false as const,
        code: "no_client" as const,
        message: "No client workspace linked to this account.",
      };
    }

    const clientId = profile.client_id as string;

    // Mark pending + clear stale QR.
    const { error: upsertError } = await supabase
      .from("device_connections")
      .upsert(
        {
          client_id: clientId,
          platform,
          device_slot: deviceSlot,
          connection_status: "pending",
          qr_code: null,
          qr_expires_at: null,
        },
        { onConflict: "client_id,platform,device_slot" },
      );

    if (upsertError) {
      return {
        ok: false as const,
        code: "db_error" as const,
        message: upsertError.message,
      };
    }

    const envKey = `${platform.toUpperCase()}_SESSION_SERVICE_URL`;
    const baseUrl = process.env[envKey] || process.env.SESSION_SERVICE_URL || PUBLIC_SESSION_SERVICE_URL;

    if (!baseUrl) {
      return {
        ok: false as const,
        code: "config_missing" as const,
        message:
          "WhatsApp session service is not configured yet. Please connect external Node.js Baileys backend.",
      };
    }

    const targetUrl = buildSessionServiceUrl(
      baseUrl,
      `/api/start-session/${platform}/device-${deviceSlot}`,
    );

    const payload = {
      client_id: clientId,
      platform,
      device_slot: deviceSlot,
      connection_status: "pending",
    };

    try {
      const res = await fetch(targetUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(process.env.SESSION_SERVICE_TOKEN
            ? { Authorization: `Bearer ${process.env.SESSION_SERVICE_TOKEN}` }
            : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        return {
          ok: false as const,
          code: "upstream_error" as const,
          message: `Session service responded ${res.status}`,
          detail: text.slice(0, 500),
          target: targetUrl,
        };
      }

      return {
        ok: true as const,
        target: targetUrl,
      };
    } catch (err) {
      return {
        ok: false as const,
        code: "network" as const,
        message:
          err instanceof Error
            ? err.message
            : "Could not reach the session service.",
        target: targetUrl,
      };
    }
  });

export const disconnectDeviceSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => sessionInput.parse(input))
  .handler(async ({ data, context }) => {
    const { platform, deviceSlot } = data as SessionInput;
    const { supabase, userId } = context;

    const { data: profile } = await supabase
      .from("profiles")
      .select("client_id")
      .eq("id", userId)
      .maybeSingle();

    if (!profile?.client_id) {
      return { ok: false as const, message: "No client workspace linked." };
    }

    const clientId = profile.client_id as string;

    const baseUrl =
      process.env.SESSION_SERVICE_DISCONNECT_URL ||
      process.env.SESSION_SERVICE_URL ||
      PUBLIC_SESSION_SERVICE_URL;

    if (!baseUrl) {
      return {
        ok: false as const,
        code: "config_missing" as const,
        message:
          "WhatsApp session service is not configured yet. Please connect external Node.js Baileys backend.",
      };
    }

    const targetUrl = buildSessionServiceUrl(
      baseUrl,
      `/api/stop-session/${platform}/device-${deviceSlot}`,
    );

    // Best-effort upstream notify; failure should not block local clear.
    void fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.SESSION_SERVICE_TOKEN
          ? { Authorization: `Bearer ${process.env.SESSION_SERVICE_TOKEN}` }
          : {}),
      },
      body: JSON.stringify({ client_id: clientId, platform, device_slot: deviceSlot }),
    }).catch(() => null);

    const { error } = await supabase
      .from("device_connections")
      .upsert(
        {
          client_id: clientId,
          platform,
          device_slot: deviceSlot,
          connection_status: "empty",
          connection_name: null,
          device_name: null,
          qr_code: null,
          qr_expires_at: null,
          last_connected_at: null,
          session_health: null,
        },
        { onConflict: "client_id,platform,device_slot" },
      );

    if (error) {
      return { ok: false as const, message: error.message };
    }
    return { ok: true as const };
  });
