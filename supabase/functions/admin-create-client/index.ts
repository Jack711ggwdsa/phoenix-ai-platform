// Admin-only: creates an auth user, a client record, and links them via profiles.client_id.
// Caller must be authenticated and have role 'admin' (checked via has_role).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;

    const auth = req.headers.get("Authorization") ?? "";
    if (!auth.startsWith("Bearer ")) return json({ error: "Missing Authorization" }, 401);

    // Verify caller is admin
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: auth } },
    });
    const { data: userData, error: uErr } = await userClient.auth.getUser();
    if (uErr || !userData.user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: isAdmin, error: rErr } = await admin.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    if (rErr) return json({ error: rErr.message }, 500);
    if (!isAdmin) return json({ error: "Forbidden: admin only" }, 403);

    const body = await req.json();
    const {
      email,
      password,
      client_name,
      business_industry,
      package_name,
      monthly_fee,
      expiry_date,
      status,
      telegram_bot_link,
      whatsapp_link,
      whatsapp_status,
      messenger_link,
      messenger_status,
      instagram_link,
      instagram_status,
      n8n_workflow_link,
      ai_prompt,
      ai_business_info,
      faq,
      service_pricing,
      promotion,
      renewal_note,
      internal_admin_note,
      password_note,
      n8n_workflow_name,
      n8n_workflow_status,
      automation_note,
    } = body ?? {};

    if (!email || !password || !client_name) {
      return json({ error: "email, password and client_name are required" }, 400);
    }

    // 1. Create auth user (email confirmed)
    const { data: created, error: cErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (cErr || !created.user) return json({ error: cErr?.message ?? "Failed to create user" }, 400);
    const userId = created.user.id;

    // 2. Create client record
    const { data: client, error: clErr } = await admin
      .from("clients")
      .insert({
        client_name,
        email,
        business_industry: business_industry ?? null,
        business_type: business_industry ?? null,
        package_name: package_name ?? null,
        monthly_fee: monthly_fee != null ? Number(monthly_fee) : 0,
        expiry_date: expiry_date || null,
        status: status || "active",
        telegram_bot_link: telegram_bot_link ?? null,
        telegram_bot: telegram_bot_link ?? null,
        whatsapp_link: whatsapp_link ?? null,
        whatsapp_status: whatsapp_status ?? "disconnected",
        messenger_link: messenger_link ?? null,
        messenger_status: messenger_status ?? "disconnected",
        instagram_link: instagram_link ?? null,
        instagram_status: instagram_status ?? "disconnected",
        n8n_workflow_link: n8n_workflow_link ?? null,
        n8n_workflow_name: n8n_workflow_name ?? null,
        n8n_workflow_status: n8n_workflow_status ?? "inactive",
        automation_note: automation_note ?? null,
        ai_prompt: ai_prompt ?? null,
        ai_business_info: ai_business_info ?? null,
        faq: faq ?? null,
        service_pricing: service_pricing ?? null,
        promotion: promotion ?? null,
        renewal_note: renewal_note ?? null,
        internal_admin_note: internal_admin_note ?? null,
        temporary_password: password,
        current_password_admin_only: password,
        password_updated_at: new Date().toISOString(),
        password_note: password_note ?? null,
      })
      .select()
      .single();
    if (clErr) {
      await admin.auth.admin.deleteUser(userId);
      return json({ error: clErr.message }, 400);
    }

    // 3. Create profile + role rows linked to client
    const { error: pErr } = await admin
      .from("profiles")
      .upsert({ id: userId, email, role: "client", client_id: client.id });
    if (pErr) return json({ error: pErr.message }, 400);

    await admin.from("user_roles").upsert({ user_id: userId, role: "client" }, { onConflict: "user_id,role" });

    return json({ ok: true, user_id: userId, client_id: client.id });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
