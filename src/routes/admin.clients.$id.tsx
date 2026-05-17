import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Loader2, Play, Pause, Save, MessageSquare, Trash2, KeyRound, Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { daysRemainingLabel } from "@/lib/client-status";
import { ChannelEditor } from "@/components/ChannelEditor";

export const Route = createFileRoute("/admin/clients/$id")({ component: ClientDetailPage });

function ClientDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [c, setC] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [pwd, setPwd] = useState("");
  const [pwdNote, setPwdNote] = useState("");
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [selectedSub, setSelectedSub] = useState<string | null>(null);
  const [tab, setTab] = useState<"profile" | "submissions">("profile");

  const load = async () => {
    const { data, error } = await supabase.from("clients").select("*").eq("id", id).maybeSingle();
    if (error) toast.error(error.message);
    setC(data);
    setPwdNote(data?.password_note ?? "");
    const { data: subs } = await supabase
      .from("client_submissions").select("*").eq("client_id", id).order("submitted_at", { ascending: false });
    setSubmissions(subs ?? []);
    if (subs && subs.length && !selectedSub) setSelectedSub(subs[0].id);
  };
  useEffect(() => { load(); }, [id]);

  if (!c) return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-gold" /></div>;

  const update = (patch: any) => setC({ ...c, ...patch });

  const save = async () => {
    setBusy(true);
    const { error } = await supabase.from("clients").update({
      client_name: c.client_name, email: c.email, status: c.status,
      expiry_date: c.expiry_date || null,
      business_industry: c.business_industry, package_name: c.package_name,
      monthly_fee: Number(c.monthly_fee || 0),
      n8n_workflow_link: c.n8n_workflow_link,
      n8n_workflow_name: c.n8n_workflow_name,
      n8n_workflow_status: c.n8n_workflow_status,
      automation_note: c.automation_note,
      ai_business_info: c.ai_business_info,
      ai_prompt: c.ai_prompt,
      faq: c.faq,
      service_pricing: c.service_pricing,
      promotion: c.promotion,
      preferred_language: c.preferred_language,
      other_notes: c.other_notes,
      renewal_note: c.renewal_note,
      internal_admin_note: c.internal_admin_note,
      password_note: c.password_note,
    }).eq("id", id);
    setBusy(false);
    if (error) toast.error(error.message); else { toast.success("Saved"); load(); }
  };

  const toggle = async () => {
    const next = c.status === "active" ? "paused" : "active";
    const { error } = await supabase.from("clients").update({ status: next }).eq("id", id);
    if (error) toast.error(error.message); else { update({ status: next }); toast.success(next === "active" ? "Activated" : "Paused"); }
  };

  const remove = async () => {
    if (!confirm(`Delete client "${c.client_name}"? The login account remains but loses access.`)) return;
    const { error } = await supabase.from("clients").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Client deleted");
    navigate({ to: "/admin" });
  };

  const resetPassword = async () => {
    if (pwd.length < 6) { toast.error("New password must be at least 6 characters"); return; }
    const { data, error } = await supabase.functions.invoke("admin-update-password", {
      body: { client_id: id, password: pwd, password_note: pwdNote },
    });
    const errMsg = (data as any)?.error ?? error?.message;
    if (errMsg) { toast.error(errMsg); return; }
    toast.success("Client password updated successfully.");
    setPwd("");
    load();
  };

  const copyPwd = async () => {
    const value = c.current_password_admin_only ?? c.temporary_password;
    if (!value) return;
    await navigator.clipboard.writeText(value);
    toast.success("Password copied");
  };

  const CHECKLIST_KEYS = [
    { key: "checklist_info_reviewed",     label: "Info reviewed" },
    { key: "checklist_prompt_updated",    label: "Prompt updated" },
    { key: "checklist_n8n_updated",       label: "n8n workflow updated" },
    { key: "checklist_ai_tested",         label: "AI reply tested" },
    { key: "checklist_confirmation_sent", label: "Confirmation sent to client" },
  ] as const;

  const updateSubmission = async (patch: Record<string, any>) => {
    if (!selectedSub) return;
    const { error } = await supabase.from("client_submissions").update(patch as never).eq("id", selectedSub);
    if (error) { toast.error(error.message); return; }
    setSubmissions((prev) => prev.map((s) => s.id === selectedSub ? { ...s, ...patch } : s));
  };

  const toggleChecklist = (key: string, current: boolean) => updateSubmission({ [key]: !current });

  const sub = submissions.find((s) => s.id === selectedSub);
  const prevSub = sub ? submissions[submissions.findIndex((s) => s.id === sub.id) + 1] : null;

  return (
    <div>
      <Link to="/admin" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-gold">
        <ArrowLeft size={14} /> Back to clients
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-gradient-gold">{c.client_name}</h1>
          <p className="text-sm text-muted-foreground">{c.email} · {daysRemainingLabel(c.expiry_date)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/admin/chat-logs" search={{ client: c.id } as any}
            className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:border-gold hover:text-gold">
            <MessageSquare size={14} /> Chat logs
          </Link>
          <button onClick={toggle} className="inline-flex items-center gap-2 rounded-md border border-gold/40 bg-gold/10 px-3 py-2 text-sm text-gold">
            {c.status === "active" ? <><Pause size={14} /> Pause</> : <><Play size={14} /> Activate</>}
          </button>
          <button onClick={remove} className="inline-flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <Trash2 size={14} /> Delete
          </button>
          <button onClick={save} disabled={busy} className="inline-flex items-center gap-2 rounded-md bg-gradient-gold px-4 py-2 text-sm font-semibold text-primary-foreground shadow-gold disabled:opacity-50">
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
          </button>
        </div>
      </div>

      <div className="mt-6 flex gap-2 border-b border-border/50">
        {(["profile", "submissions"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-2 text-sm capitalize ${tab === t ? "border-b-2 border-gold text-gold" : "text-muted-foreground"}`}>
            {t} {t === "submissions" && submissions.length > 0 && <span className="ml-1 rounded-full bg-gold/20 px-1.5 text-[10px] text-gold">{submissions.length}</span>}
          </button>
        ))}
      </div>

      {tab === "profile" ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Card title="Profile">
            <Field label="Client name" value={c.client_name ?? ""} onChange={(v) => update({ client_name: v })} />
            <Field label="Email" type="email" value={c.email ?? ""} onChange={(v) => update({ email: v })} />
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">
                Client UUID (Admin Only)
              </label>
              <div className="flex items-center gap-2 rounded-md border border-gold/30 bg-gold/5 p-2 text-sm">
                <span className="flex-1 break-all font-mono text-foreground">{c.id}</span>
                <button
                  type="button"
                  onClick={() => { navigator.clipboard.writeText(c.id); toast.success("UUID copied"); }}
                  className="rounded p-1 text-gold hover:bg-gold/10"
                  aria-label="Copy UUID"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Permanent internal ID for n8n and integrations. Never shown to clients.</p>
            </div>
            <Field label="Business industry" value={c.business_industry ?? ""} onChange={(v) => update({ business_industry: v })} />
            <Field label="Package name" value={c.package_name ?? ""} onChange={(v) => update({ package_name: v })} />
          </Card>

          <Card title="Subscription">
            <Select label="Status" value={c.status} onChange={(v) => update({ status: v })} options={["active","paused","expired"]} />
            <Field label="Expiry date" type="date" value={c.expiry_date ?? ""} onChange={(v) => update({ expiry_date: v })} />
            <Field label="Monthly fee ($)" type="number" step="0.01" value={String(c.monthly_fee ?? 0)} onChange={(v) => update({ monthly_fee: v })} />
          </Card>

          <Card title="Password (admin only)">
            {(c.current_password_admin_only ?? c.temporary_password) ? (
              <div className="flex items-center justify-between gap-2 rounded-md border border-gold/30 bg-gold/5 p-3 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">Current password on file</div>
                  <div className="font-mono text-foreground">{c.current_password_admin_only ?? c.temporary_password}</div>
                  {c.password_updated_at && (
                    <div className="text-[11px] text-muted-foreground">Updated {new Date(c.password_updated_at).toLocaleString()}</div>
                  )}
                </div>
                <button onClick={copyPwd} className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs">
                  <Copy size={12} /> Copy
                </button>
              </div>
            ) : (
              <div className="rounded-md border border-border/60 bg-background/40 p-3 text-sm text-muted-foreground">
                No password saved yet. Set a new password below.
              </div>
            )}
            <Field label="New password" value={pwd} onChange={setPwd} placeholder="min 6 chars" />
            <Field label="Password note" value={pwdNote} onChange={setPwdNote} />
            <button onClick={resetPassword} className="inline-flex items-center gap-2 rounded-md border border-gold/40 bg-gold/10 px-3 py-2 text-sm text-gold">
              <KeyRound size={14} /> Update password
            </button>
            <p className="text-[11px] text-muted-foreground">Password is never shown to the client.</p>
          </Card>

          <Card title="Channels">
            <ChannelEditor clientId={c.id} initial={c} onSaved={load} />
          </Card>

          <Card title="Client content (latest)">
            <TextArea label="AI business info" rows={3} value={c.ai_business_info ?? ""} onChange={(v) => update({ ai_business_info: v })} />
            <TextArea label="AI reply instruction" rows={6} value={c.ai_prompt ?? ""} onChange={(v) => update({ ai_prompt: v })} />
            <Field label="Preferred language" value={c.preferred_language ?? ""} onChange={(v) => update({ preferred_language: v })} />
            <TextArea label="FAQ" rows={3} value={c.faq ?? ""} onChange={(v) => update({ faq: v })} />
            <TextArea label="Service pricing" rows={2} value={c.service_pricing ?? ""} onChange={(v) => update({ service_pricing: v })} />
            <TextArea label="Promotion" rows={2} value={c.promotion ?? ""} onChange={(v) => update({ promotion: v })} />
            <TextArea label="Other notes" rows={2} value={c.other_notes ?? ""} onChange={(v) => update({ other_notes: v })} />
            <TextArea label="Renewal note (visible to client)" rows={2} value={c.renewal_note ?? ""} onChange={(v) => update({ renewal_note: v })} />
          </Card>

          <Card title="Admin only — never shown to client">
            <Field label="n8n workflow link" value={c.n8n_workflow_link ?? ""} onChange={(v) => update({ n8n_workflow_link: v })} />
            <Field label="n8n workflow name" value={c.n8n_workflow_name ?? ""} onChange={(v) => update({ n8n_workflow_name: v })} />
            <Select label="n8n workflow status" value={c.n8n_workflow_status ?? "inactive"} onChange={(v) => update({ n8n_workflow_status: v })} options={["active","inactive","error"]} />
            <TextArea label="Automation note" rows={2} value={c.automation_note ?? ""} onChange={(v) => update({ automation_note: v })} />
            <TextArea label="Internal admin note" rows={3} value={c.internal_admin_note ?? ""} onChange={(v) => update({ internal_admin_note: v })} />
          </Card>
        </div>
      ) : (
        <div className="mt-4 grid gap-4 lg:grid-cols-[260px_1fr]">
          <div className="rounded-xl glass p-3">
            <h3 className="mb-2 px-2 font-display text-sm uppercase tracking-widest text-gold">Submissions</h3>
            {submissions.length === 0 ? (
              <p className="px-2 py-4 text-xs text-muted-foreground">No submissions yet.</p>
            ) : submissions.map((s) => (
              <button key={s.id} onClick={() => setSelectedSub(s.id)}
                className={`w-full rounded-md px-2 py-2 text-left text-xs ${selectedSub === s.id ? "bg-gold/15 text-gold" : "text-muted-foreground hover:bg-gold/5"}`}>
                <div>{new Date(s.submitted_at).toLocaleString()}</div>
                <div className="text-[10px] uppercase tracking-wider">{s.status}</div>
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {sub ? (
              <>
                <div className="rounded-xl glass p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-display text-lg text-gold">Submission</h3>
                    <select value={sub.status} onChange={(e) => updateSubmission({ status: e.target.value })}
                      className="rounded-md border border-border bg-input px-3 py-1.5 text-sm">
                      <option value="new">New</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                  <div className="mt-3 space-y-3 text-sm">
                    {(["ai_business_info","ai_prompt","preferred_language","service_pricing","promotion","faq","other_notes"] as const).map((k) => (
                      <DiffField key={k} label={k.replace(/_/g," ").replace(/\b\w/g, (m) => m.toUpperCase())}
                        oldVal={prevSub?.[k]} newVal={sub[k]} />
                    ))}
                  </div>
                </div>

                <div className="rounded-xl glass p-5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-lg text-gold">Admin Checklist</h3>
                    <span className="text-xs text-muted-foreground">{CHECKLIST_KEYS.filter((c) => sub[c.key]).length}/{CHECKLIST_KEYS.length} completed</span>
                  </div>
                  <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                    {CHECKLIST_KEYS.map((item) => {
                      const done = !!sub[item.key];
                      return (
                        <li key={item.key}>
                          <button onClick={() => toggleChecklist(item.key, done)}
                            className={`flex w-full items-center gap-2 rounded-md border px-3 py-2 text-sm ${done ? "border-gold/40 bg-gold/10 text-gold" : "border-border/50 bg-background/40 text-foreground"}`}>
                            <span className={`flex h-4 w-4 items-center justify-center rounded border ${done ? "border-gold bg-gold/30" : "border-border"}`}>
                              {done && <Check size={12} />}
                            </span>
                            {item.label}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <div className="rounded-xl glass p-5">
                  <h3 className="font-display text-lg text-gold">Admin Notes</h3>
                  <textarea
                    rows={4}
                    defaultValue={sub.admin_notes ?? ""}
                    onBlur={(e) => { if (e.target.value !== (sub.admin_notes ?? "")) updateSubmission({ admin_notes: e.target.value }); }}
                    className="mt-2 w-full rounded-md border border-border bg-input px-3 py-2 text-sm outline-none focus:border-gold"
                    placeholder="Notes for the team..."
                  />
                </div>
              </>
            ) : (
              <div className="rounded-xl glass p-10 text-center text-muted-foreground">Select a submission.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DiffField({ label, oldVal, newVal }: { label: string; oldVal?: string | null; newVal?: string | null }) {
  const changed = (oldVal ?? "") !== (newVal ?? "");
  return (
    <div className={`rounded-md border p-3 ${changed ? "border-gold/40 bg-gold/5" : "border-border/40 bg-background/40"}`}>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label} {changed && <span className="ml-1 rounded-full bg-gold/20 px-1.5 text-[10px] text-gold">changed</span>}</div>
      {changed && oldVal && (
        <div className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground line-through">{oldVal}</div>
      )}
      <div className="mt-1 whitespace-pre-wrap text-sm text-foreground">{newVal || <span className="text-muted-foreground">—</span>}</div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl glass p-5">
      <h3 className="mb-3 font-display text-lg text-gold">{title}</h3>
      <div className="space-y-3">{children}</div>
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
        {options.map((o: string) => <option key={o} value={o}>{o}</option>)}
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
