import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import {
  Loader2, CheckCircle2, PauseCircle, Calendar, Briefcase, Package, Sparkles, Send,
} from "lucide-react";
import { toast } from "sonner";
import { isClientActive, daysRemainingLabel, liveStatus } from "@/lib/client-status";
import { ContactAdminCard } from "@/components/ContactAdminCard";
import { ChannelEditor } from "@/components/ChannelEditor";

export const Route = createFileRoute("/client/")({ component: ClientDashboard });

const SETUP_FIELDS = [
  { key: "ai_business_info", label: "AI Business Info", rows: 4, placeholder: "Tell us about your business..." },
  { key: "ai_prompt",        label: "AI Reply Instruction", rows: 5, placeholder: "How should the AI talk to your customers?" },
  { key: "preferred_language", label: "Preferred Language", rows: 1, placeholder: "e.g. English, Bahasa Malaysia, Chinese" },
  { key: "service_pricing",  label: "Service Pricing", rows: 3, placeholder: "List your services and prices..." },
  { key: "promotion",        label: "Promotion", rows: 2, placeholder: "Current promotion or offer..." },
  { key: "faq",              label: "FAQ", rows: 4, placeholder: "Common questions and answers..." },
  { key: "other_notes",      label: "Other Notes", rows: 2, placeholder: "Anything else our team should know..." },
] as const;

type SetupKey = typeof SETUP_FIELDS[number]["key"];

function ClientDashboard() {
  const { profile } = useAuth();
  const [c, setC] = useState<any | null | undefined>(undefined);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [setup, setSetup] = useState<Record<SetupKey, string>>({
    ai_business_info: "", ai_prompt: "", preferred_language: "",
    service_pricing: "", promotion: "", faq: "", other_notes: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const load = async (clientId: string) => {
    const [{ data: client }, { data: subs }] = await Promise.all([
      supabase.from("clients").select("*").eq("id", clientId).maybeSingle(),
      supabase.from("client_submissions").select("*").eq("client_id", clientId).order("submitted_at", { ascending: false }).limit(10),
    ]);
    setC(client);
    setSubmissions(subs ?? []);
    if (client) {
      setSetup({
        ai_business_info: client.ai_business_info ?? "",
        ai_prompt: client.ai_prompt ?? "",
        preferred_language: client.preferred_language ?? "",
        service_pricing: client.service_pricing ?? "",
        promotion: client.promotion ?? "",
        faq: client.faq ?? "",
        other_notes: client.other_notes ?? "",
      });
    }
  };

  useEffect(() => {
    if (!profile?.client_id) { setC(null); return; }
    load(profile.client_id);
  }, [profile?.client_id]);

  const submitSetup = async () => {
    if (!c) return;
    setSubmitting(true);
    // Update clients (latest), then insert immutable submission record
    const { error: upErr } = await supabase.from("clients").update(setup as never).eq("id", c.id);
    if (upErr) { setSubmitting(false); toast.error(upErr.message); return; }
    const { error: insErr } = await supabase.from("client_submissions").insert({
      client_id: c.id,
      submitted_by: profile?.id,
      client_name: c.client_name,
      client_email: c.email,
      ...setup,
      status: "new",
    } as never);
    setSubmitting(false);
    if (insErr) { toast.error(insErr.message); return; }
    toast.success("Your information has been submitted to Phoenix AI team.");
    load(c.id);
  };

  if (c === undefined) return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-gold" /></div>;

  if (!c) {
    return (
      <div className="rounded-xl glass p-10 text-center">
        <h1 className="font-display text-2xl text-gradient-gold">Account not linked</h1>
        <p className="mt-2 text-sm text-muted-foreground">Your account isn't linked to a client record yet. Please contact Phoenix Advertisement &amp; Design.</p>
        <div className="mt-6"><ContactAdminCard /></div>
      </div>
    );
  }

  const status = liveStatus(c);
  const active = isClientActive(c);
  const lastSub = submissions[0];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-3xl text-gradient-gold">Welcome, {c.client_name}</h1>
        <p className="text-sm text-muted-foreground">{c.email}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className={`rounded-2xl glass p-6 lg:col-span-2 ${active ? "shadow-gold" : ""}`}>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">AI Service Status</div>
          <div className={`mt-1 flex items-center gap-2 font-display text-3xl ${active ? "text-gold" : "text-destructive-foreground"}`}>
            {active ? <CheckCircle2 /> : <PauseCircle />}
            {active ? "AI Service Active" : status === "paused" ? "AI Service Paused" : "AI Service Expired"}
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat icon={<Briefcase size={14} />} label="Industry" value={c.business_industry ?? "—"} />
            <Stat icon={<Package size={14} />} label="Package" value={c.package_name ?? "—"} />
            <Stat icon={<Calendar size={14} />} label="Expiry" value={c.expiry_date ?? "—"} />
            <Stat icon={<Calendar size={14} />} label="Days remaining" value={daysRemainingLabel(c.expiry_date)} />
          </div>
        </div>

        <ContactAdminCard />
      </div>

      {!active ? (
        <div className="rounded-2xl glass p-6 border border-destructive/30">
          <h3 className="font-display text-lg text-gold">{status === "paused" ? "AI Service Paused" : "Subscription Expired"}</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Your Phoenix AI service is currently {status}. Please contact Phoenix AI Support to renew.
          </p>
          {c.renewal_note && (
            <p className="mt-3 rounded-md border border-border/50 bg-background/40 p-3 text-sm">{c.renewal_note}</p>
          )}
          <div className="mt-4">
            <h4 className="font-display text-sm uppercase tracking-widest text-gold">Channels (read-only)</h4>
            <div className="mt-3">
              <ChannelEditor clientId={c.id} initial={c} readOnly />
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="rounded-2xl glass p-6">
            <h3 className="font-display text-lg text-gold">Channels</h3>
            <p className="mt-1 text-xs text-muted-foreground">Add or update your platform links. Status updates automatically.</p>
            <div className="mt-4">
              <ChannelEditor clientId={c.id} initial={c} onSaved={() => load(c.id)} />
            </div>
          </div>

          <div className="rounded-2xl glass p-6">
            <h3 className="font-display text-lg text-gold flex items-center gap-2"><Sparkles size={18} /> Phoenix AI Automation Status</h3>
            <p className="mt-2 text-sm text-foreground/90">Your Phoenix AI automation is active and running.</p>
          </div>

          <div className="rounded-2xl glass p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-display text-lg text-gold">AI Setup Information</h3>
              {lastSub && (
                <div className="text-xs text-muted-foreground">
                  Last submitted {new Date(lastSub.submitted_at).toLocaleString()} · <StatusBadge status={lastSub.status} />
                </div>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Fill in everything once and submit as one package. Our team will configure your AI shortly.
            </p>

            <div className="mt-4 grid gap-3">
              {SETUP_FIELDS.map((f) => (
                <label key={f.key} className="block">
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">{f.label}</span>
                  {f.rows === 1 ? (
                    <input
                      value={setup[f.key]}
                      onChange={(e) => setSetup({ ...setup, [f.key]: e.target.value })}
                      placeholder={f.placeholder}
                      className="mt-1 w-full rounded-md border border-border bg-input px-3 py-2 text-sm outline-none focus:border-gold"
                    />
                  ) : (
                    <textarea
                      rows={f.rows}
                      value={setup[f.key]}
                      onChange={(e) => setSetup({ ...setup, [f.key]: e.target.value })}
                      placeholder={f.placeholder}
                      className="mt-1 w-full rounded-md border border-border bg-input px-3 py-2 text-sm outline-none focus:border-gold"
                    />
                  )}
                </label>
              ))}
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={submitSetup}
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-md bg-gradient-gold px-4 py-2 text-sm font-semibold text-primary-foreground shadow-gold disabled:opacity-50"
              >
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Submit AI Setup Information
              </button>
            </div>
          </div>

          {submissions.length > 0 && (
            <div className="rounded-2xl glass p-6">
              <h3 className="font-display text-lg text-gold">Submission History</h3>
              <ul className="mt-3 space-y-2">
                {submissions.map((s) => (
                  <li key={s.id} className="flex items-center justify-between rounded-md border border-border/50 bg-background/40 p-3 text-sm">
                    <span className="text-muted-foreground">{new Date(s.submitted_at).toLocaleString()}</span>
                    <StatusBadge status={s.status} />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {c.renewal_note && (
            <div className="rounded-2xl glass p-6">
              <h3 className="font-display text-lg text-gold">Renewal Note</h3>
              <p className="mt-2 text-sm text-muted-foreground">{c.renewal_note}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    new: "bg-gold/15 text-gold",
    in_progress: "bg-blue-500/15 text-blue-400",
    completed: "bg-green-500/15 text-green-400",
  };
  const label = status === "in_progress" ? "In Progress" : status[0].toUpperCase() + status.slice(1);
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] ${map[status] ?? "bg-muted/30 text-muted-foreground"}`}>{label}</span>;
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-border/50 bg-background/40 p-3">
      <div className="flex items-center gap-1 text-xs uppercase tracking-widest text-muted-foreground">{icon}{label}</div>
      <div className="mt-1 font-display text-lg text-foreground">{value}</div>
    </div>
  );
}
