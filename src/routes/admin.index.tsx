import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Loader2, CheckCircle2, PauseCircle, Check, X } from "lucide-react";
import { toast } from "sonner";
import { liveStatus, daysRemainingLabel } from "@/lib/client-status";

export const Route = createFileRoute("/admin/")({ component: AdminClientsPage });

interface Client {
  id: string;
  client_id: string;
  client_name: string;
  email: string;
  status: string;
  expiry_date: string | null;
  business_industry: string | null;
  business_type: string | null;
  package_name: string | null;
  monthly_fee: number | null;
  temporary_password: string | null;
  password_note: string | null;
  n8n_workflow_link: string | null;
  telegram_bot_link: string | null;
  telegram_bot: string | null;
  whatsapp_link: string | null;
  whatsapp_status: string | null;
  messenger_link: string | null;
  messenger_status: string | null;
  instagram_link: string | null;
  instagram_status: string | null;
  updated_at: string | null;
}

function ChannelDot({ on, label }: { on: boolean; label?: string }) {
  return (
    <span title={label} className={`inline-flex h-5 w-5 items-center justify-center rounded-full ${on ? "bg-gold/20 text-gold" : "bg-muted/30 text-muted-foreground"}`}>
      {on ? <Check size={12} /> : <X size={12} />}
    </span>
  );
}

function AdminClientsPage() {
  const [clients, setClients] = useState<Client[] | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [updates, setUpdates] = useState<any[]>([]);
  const [progress, setProgress] = useState<Record<string, { last: any; doneTotal: { done: number; total: number } | null }>>({});

  const load = async () => {
    const { data, error } = await supabase
      .from("clients").select("*").order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setClients(data as Client[]);

    const { data: pending } = await supabase
      .from("client_submissions")
      .select("*")
      .is("archived_at", null)
      .neq("status", "completed")
      .order("submitted_at", { ascending: false })
      .limit(10);
    setUpdates(pending ?? []);

    // Latest submission + 5-item checklist progress per client
    const { data: latestSubs } = await supabase
      .from("client_submissions")
      .select("id, client_id, status, submitted_at, checklist_info_reviewed, checklist_prompt_updated, checklist_n8n_updated, checklist_ai_tested, checklist_confirmation_sent")
      .order("submitted_at", { ascending: false });
    const byClient: Record<string, any> = {};
    (latestSubs ?? []).forEach((s: any) => { if (!byClient[s.client_id]) byClient[s.client_id] = s; });

    const prog: Record<string, { last: any; doneTotal: { done: number; total: number } | null }> = {};
    Object.entries(byClient).forEach(([cid, sub]: any) => {
      const keys = ["checklist_info_reviewed","checklist_prompt_updated","checklist_n8n_updated","checklist_ai_tested","checklist_confirmation_sent"];
      const done = keys.filter((k) => sub[k]).length;
      prog[cid] = { last: sub, doneTotal: { done, total: keys.length } };
    });
    setProgress(prog);
  };
  useEffect(() => { load(); }, []);

  return (
    <div>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-gradient-gold">Clients</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage your Phoenix AI Platform subscriptions.</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-2 rounded-md bg-gradient-gold px-4 py-2 text-sm font-semibold text-primary-foreground shadow-gold"
        >
          <Plus size={16} /> Add client
        </button>
      </div>

      {updates.length > 0 && (
        <div className="mb-6 rounded-2xl glass p-5 border border-gold/30">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg text-gold">New Client Submission{updates.length > 1 ? "s" : ""}</h2>
            <Link to="/admin/activity" className="text-xs text-gold hover:underline">View all submissions</Link>
          </div>
          <ul className="mt-3 divide-y divide-border/40">
            {updates.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <div>
                  <span className="font-medium">{u.client_name ?? "—"}</span>
                  <span className="ml-2 text-xs text-muted-foreground">submitted AI Setup Information on {new Date(u.submitted_at).toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] ${u.status === "new" ? "bg-gold/15 text-gold" : "bg-blue-500/15 text-blue-400"}`}>
                    {u.status === "new" ? "New" : "In Progress"}
                  </span>
                  <Link to="/admin/activity" className="text-xs text-gold hover:underline">View Details</Link>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!clients ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-gold" /></div>
      ) : clients.length === 0 ? (
        <div className="rounded-xl glass p-12 text-center text-muted-foreground">
          No clients yet. Add your first one.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl glass">
          <table className="w-full text-sm">
            <thead className="border-b border-border/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-3 text-left">Client</th>
                <th className="px-3 py-3 text-left">Password</th>
                <th className="px-3 py-3 text-left">Industry</th>
                <th className="px-3 py-3 text-left">Package</th>
                <th className="px-3 py-3 text-left">Status</th>
                <th className="px-3 py-3 text-left">Expiry</th>
                <th className="px-3 py-3 text-left">Days left</th>
                <th className="px-3 py-3 text-left">Fee</th>
                <th className="px-3 py-3 text-center">TG</th>
                <th className="px-3 py-3 text-center">WA</th>
                <th className="px-3 py-3 text-center">MSG</th>
                <th className="px-3 py-3 text-center">IG</th>
                <th className="px-3 py-3 text-left">Last submission</th>
                <th className="px-3 py-3 text-left">Submission</th>
                <th className="px-3 py-3 text-left">Setup</th>
                <th className="px-3 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => {
                const live = liveStatus(c);
                const tg = !!(c.telegram_bot_link || c.telegram_bot);
                const p = progress[c.id];
                return (
                  <tr key={c.id} className="border-b border-border/30 last:border-0 hover:bg-gold/5">
                    <td className="px-3 py-3">
                      <div className="font-medium">{c.client_name}</div>
                      <div className="text-xs text-muted-foreground">{c.email}</div>
                    </td>
                    <td className="px-3 py-3 font-mono text-xs text-muted-foreground" title={c.password_note ?? ""}>
                      {(c as any).current_password_admin_only ?? c.temporary_password ?? "—"}
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">{c.business_industry ?? c.business_type ?? "—"}</td>
                    <td className="px-3 py-3 text-muted-foreground">{c.package_name ?? "—"}</td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${live === "active" ? "bg-gold/15 text-gold" : "bg-destructive/15 text-destructive-foreground"}`}>
                        {live === "active" ? <CheckCircle2 size={12} /> : <PauseCircle size={12} />}
                        {live[0].toUpperCase() + live.slice(1)}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">{c.expiry_date ?? "—"}</td>
                    <td className="px-3 py-3 text-muted-foreground">{daysRemainingLabel(c.expiry_date)}</td>
                    <td className="px-3 py-3 text-muted-foreground">${Number(c.monthly_fee ?? 0).toFixed(2)}</td>
                    <td className="px-3 py-3 text-center"><ChannelDot on={tg} label="Telegram" /></td>
                    <td className="px-3 py-3 text-center"><ChannelDot on={!!c.whatsapp_link} label="WhatsApp" /></td>
                    <td className="px-3 py-3 text-center"><ChannelDot on={!!c.messenger_link} label="Messenger" /></td>
                    <td className="px-3 py-3 text-center"><ChannelDot on={!!c.instagram_link} label="Instagram" /></td>
                    <td className="px-3 py-3 text-xs text-muted-foreground">{p?.last ? new Date(p.last.submitted_at).toLocaleDateString() : "—"}</td>
                    <td className="px-3 py-3 text-xs">{p?.last ? (p.last.status === "in_progress" ? "In Progress" : p.last.status[0].toUpperCase() + p.last.status.slice(1)) : "—"}</td>
                    <td className="px-3 py-3 text-xs text-muted-foreground">{p?.doneTotal ? `${p.doneTotal.done}/${p.doneTotal.total}` : "—"}</td>
                    <td className="px-3 py-3 text-right">
                      <Link to="/admin/clients/$id" params={{ id: c.id }} className="inline-flex items-center gap-1 text-xs text-gold hover:underline">
                        <Pencil size={12} /> Edit
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && <AddClientDialog onClose={() => setShowAdd(false)} onCreated={load} />}
    </div>
  );
}

function AddClientDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    client_name: "", email: "", password: "", password_note: "",
    business_industry: "", package_name: "", monthly_fee: "0", expiry_date: "", status: "active",
    n8n_workflow_link: "", n8n_workflow_name: "", n8n_workflow_status: "inactive", automation_note: "",
    telegram_bot_link: "",
    whatsapp_link: "", whatsapp_status: "disconnected",
    messenger_link: "", messenger_status: "disconnected",
    instagram_link: "", instagram_status: "disconnected",
    ai_business_info: "", ai_prompt: "", faq: "", service_pricing: "", promotion: "",
    renewal_note: "", internal_admin_note: "",
  });
  const [busy, setBusy] = useState(false);

  const set = (k: keyof typeof form) => (v: string) => setForm({ ...form, [k]: v });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("admin-create-client", {
      body: { ...form, monthly_fee: Number(form.monthly_fee || 0), expiry_date: form.expiry_date || null },
    });
    setBusy(false);
    const errMsg = (data as any)?.error ?? error?.message;
    if (errMsg) { toast.error(errMsg); return; }
    toast.success("Client created. They can now sign in.");
    onCreated();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4" onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={submit} className="my-8 w-full max-w-3xl rounded-2xl glass p-6 shadow-elegant">
        <h2 className="font-display text-xl text-gradient-gold">Add client</h2>
        <p className="text-xs text-muted-foreground">Creates the login account and the client profile.</p>

        <Section title="Account">
          <Field label="Client name" required value={form.client_name} onChange={set("client_name")} />
          <Field label="Client email (login)" type="email" required value={form.email} onChange={set("email")} />
          <Field label="Temporary password" type="text" required value={form.password} onChange={set("password")} placeholder="min 6 chars" />
          <Field label="Password note (admin only)" value={form.password_note} onChange={set("password_note")} />
        </Section>

        <Section title="Subscription">
          <Field label="Business industry" value={form.business_industry} onChange={set("business_industry")} />
          <Field label="Package name" value={form.package_name} onChange={set("package_name")} />
          <Field label="Monthly fee ($)" type="number" step="0.01" value={form.monthly_fee} onChange={set("monthly_fee")} />
          <Field label="Expiry date" type="date" value={form.expiry_date} onChange={set("expiry_date")} />
          <Select label="Status" value={form.status} onChange={set("status")} options={["active","expired","paused"]} />
        </Section>

        <Section title="Channels (visible to client when active)">
          <Field label="Telegram bot link" value={form.telegram_bot_link} onChange={set("telegram_bot_link")} placeholder="https://t.me/..." />
          <Field label="WhatsApp link" value={form.whatsapp_link} onChange={set("whatsapp_link")} placeholder="https://wa.me/..." />
          <Select label="WhatsApp status" value={form.whatsapp_status} onChange={set("whatsapp_status")} options={["connected","pending","disconnected"]} />
          <Field label="Messenger link" value={form.messenger_link} onChange={set("messenger_link")} placeholder="https://m.me/..." />
          <Select label="Messenger status" value={form.messenger_status} onChange={set("messenger_status")} options={["connected","pending","disconnected"]} />
          <Field label="Instagram link" value={form.instagram_link} onChange={set("instagram_link")} placeholder="https://instagram.com/..." />
          <Select label="Instagram status" value={form.instagram_status} onChange={set("instagram_status")} options={["connected","pending","disconnected"]} />
        </Section>

        <Section title="Client content (client can edit later)" cols={1}>
          <TextArea label="AI business info" rows={3} value={form.ai_business_info} onChange={set("ai_business_info")} />
          <TextArea label="AI reply instruction" rows={4} value={form.ai_prompt} onChange={set("ai_prompt")} />
          <TextArea label="FAQ" rows={3} value={form.faq} onChange={set("faq")} />
          <TextArea label="Service pricing" rows={2} value={form.service_pricing} onChange={set("service_pricing")} />
          <TextArea label="Promotion" rows={2} value={form.promotion} onChange={set("promotion")} />
          <TextArea label="Renewal note (visible to client)" rows={2} value={form.renewal_note} onChange={set("renewal_note")} />
        </Section>

        <Section title="Admin only — never shown to client" cols={1}>
          <Field label="n8n workflow link" value={form.n8n_workflow_link} onChange={set("n8n_workflow_link")} />
          <Field label="n8n workflow name" value={form.n8n_workflow_name} onChange={set("n8n_workflow_name")} />
          <Select label="n8n workflow status" value={form.n8n_workflow_status} onChange={set("n8n_workflow_status")} options={["active","inactive","error"]} />
          <TextArea label="Automation note" rows={2} value={form.automation_note} onChange={set("automation_note")} />
          <TextArea label="Internal admin note" rows={2} value={form.internal_admin_note} onChange={set("internal_admin_note")} />
        </Section>

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md border border-border px-4 py-2 text-sm">Cancel</button>
          <button disabled={busy} className="inline-flex items-center gap-2 rounded-md bg-gradient-gold px-4 py-2 text-sm font-semibold text-primary-foreground shadow-gold disabled:opacity-50">
            {busy && <Loader2 size={14} className="animate-spin" />} Create client
          </button>
        </div>
      </form>
    </div>
  );
}

function Section({ title, children, cols = 2 }: { title: string; children: React.ReactNode; cols?: 1 | 2 }) {
  return (
    <div className="mt-5">
      <h3 className="mb-2 font-display text-sm uppercase tracking-widest text-gold">{title}</h3>
      <div className={`grid gap-3 ${cols === 2 ? "sm:grid-cols-2" : ""}`}>{children}</div>
    </div>
  );
}
function Field({ label, value, onChange, ...rest }: { label: string; value: string; onChange: (v: string) => void; [k: string]: any }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      <input {...rest} value={value} onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-border bg-input px-3 py-2 text-sm outline-none focus:border-gold" />
    </label>
  );
}
function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-border bg-input px-3 py-2 text-sm outline-none focus:border-gold">
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}
function TextArea({ label, value, onChange, rows = 3 }: { label: string; value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      <textarea rows={rows} value={value} onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-border bg-input px-3 py-2 text-sm outline-none focus:border-gold" />
    </label>
  );
}
