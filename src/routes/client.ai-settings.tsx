import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Send, Sparkles, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { isClientActive } from "@/lib/client-status";
import { ContactAdminCard } from "@/components/ContactAdminCard";

export const Route = createFileRoute("/client/ai-settings")({ component: AISettingsPage });

const REPLY_STYLES = [
  "Friendly",
  "Professional",
  "Premium",
  "Soft sell",
  "Strong sales closing",
  "Short and direct",
  "Detailed explanation",
];

const LANGUAGES = ["Chinese", "English", "Bahasa Melayu", "Cantonese"];

const LEAD_RULES = [
  "Name",
  "Phone number",
  "Location",
  "Budget",
  "Service required",
  "Appointment date",
];

type FormState = {
  business_information: string;
  services_products: string;
  promotion: string;
  faq: string;
  ai_reply_style: string;
  preferred_languages: string[];
  lead_collection_rules: string[];
  business_hours: string;
  important_notes: string;
};

const EMPTY: FormState = {
  business_information: "",
  services_products: "",
  promotion: "",
  faq: "",
  ai_reply_style: "Friendly",
  preferred_languages: [],
  lead_collection_rules: [],
  business_hours: "",
  important_notes: "",
};

function AISettingsPage() {
  const { profile } = useAuth();
  const [c, setC] = useState<any | null | undefined>(undefined);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    if (!profile?.client_id) { setC(null); return; }
    (async () => {
      const [{ data: client }, { data: subs }] = await Promise.all([
        supabase.from("clients").select("*").eq("id", profile.client_id!).maybeSingle(),
        supabase.from("client_submissions").select("*")
          .eq("client_id", profile.client_id!)
          .eq("submission_kind", "ai_settings")
          .order("submitted_at", { ascending: false }).limit(5),
      ]);
      setC(client);
      setHistory(subs ?? []);
      const last: any = subs?.[0];
      if (last) {
        setForm({
          business_information: last.business_information ?? "",
          services_products: last.services_products ?? "",
          promotion: last.promotion ?? "",
          faq: last.faq ?? "",
          ai_reply_style: last.ai_reply_style ?? "Friendly",
          preferred_languages: last.preferred_languages ?? [],
          lead_collection_rules: last.lead_collection_rules ?? [],
          business_hours: last.business_hours ?? "",
          important_notes: last.important_notes ?? "",
        });
      }
    })();
  }, [profile?.client_id]);

  const toggleArr = (key: "preferred_languages" | "lead_collection_rules", value: string) => {
    setForm((f) => {
      const arr = f[key];
      return { ...f, [key]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value] };
    });
  };

  const submit = async () => {
    if (!c) return;
    setSubmitting(true);
    const { error } = await supabase.from("client_submissions").insert({
      client_id: c.id,
      submitted_by: profile?.id,
      client_name: c.client_name,
      client_email: c.email,
      submission_kind: "ai_settings",
      status: "new",
      ...form,
    } as never);
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Your AI settings have been submitted to Phoenix AI team. We will update your AI assistant shortly.");
    const { data: subs } = await supabase.from("client_submissions").select("*")
      .eq("client_id", c.id).eq("submission_kind", "ai_settings")
      .order("submitted_at", { ascending: false }).limit(5);
    setHistory(subs ?? []);
  };

  if (c === undefined) return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-gold" /></div>;
  if (!c) return (
    <div className="rounded-xl glass p-10 text-center">
      <h1 className="font-display text-2xl text-gradient-gold">Account not linked</h1>
      <p className="mt-2 text-sm text-muted-foreground">Please contact Phoenix AI Support.</p>
      <div className="mt-6"><ContactAdminCard /></div>
    </div>
  );

  const active = isClientActive(c);
  if (!active) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl glass p-6 border border-destructive/30">
          <h3 className="font-display text-lg text-gold">AI Settings unavailable</h3>
          <p className="mt-2 text-sm text-muted-foreground">Your Phoenix AI service is not active. Please renew to update your AI settings.</p>
          <div className="mt-4"><Link to="/client" className="text-xs text-gold underline">← Back to dashboard</Link></div>
        </div>
        <ContactAdminCard />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-3xl text-gradient-gold flex items-center gap-2"><Sparkles className="text-gold" /> AI Settings</h1>
        <p className="text-sm text-muted-foreground">Paste your business information and AI reply preferences. Phoenix AI team will configure your assistant.</p>
      </div>

      <Section title="1. Business Information">
        <Textarea rows={6} value={form.business_information}
          onChange={(v) => setForm({ ...form, business_information: v })}
          placeholder="Company name&#10;Business industry&#10;Location&#10;Business description&#10;Target customers" />
      </Section>

      <Section title="2. Services / Products">
        <Textarea rows={6} value={form.services_products}
          onChange={(v) => setForm({ ...form, services_products: v })}
          placeholder="List all services, products, packages, prices, and details..." />
      </Section>

      <Section title="3. Promotions">
        <Textarea rows={4} value={form.promotion}
          onChange={(v) => setForm({ ...form, promotion: v })}
          placeholder="Current promotion, discounts, campaign details, valid date..." />
      </Section>

      <Section title="4. FAQ">
        <Textarea rows={6} value={form.faq}
          onChange={(v) => setForm({ ...form, faq: v })}
          placeholder="Common questions and answers..." />
      </Section>

      <Section title="5. AI Reply Style">
        <select value={form.ai_reply_style}
          onChange={(e) => setForm({ ...form, ai_reply_style: e.target.value })}
          className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm outline-none focus:border-gold">
          {REPLY_STYLES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </Section>

      <Section title="6. Preferred Language">
        <CheckGrid options={LANGUAGES} selected={form.preferred_languages}
          onToggle={(v) => toggleArr("preferred_languages", v)} />
      </Section>

      <Section title="7. Lead Collection Rules" subtitle="AI should ask customer for:">
        <CheckGrid options={LEAD_RULES} selected={form.lead_collection_rules}
          onToggle={(v) => toggleArr("lead_collection_rules", v)} />
      </Section>

      <Section title="8. Business Hours">
        <Textarea rows={3} value={form.business_hours}
          onChange={(v) => setForm({ ...form, business_hours: v })}
          placeholder="Mon–Fri 9am–6pm&#10;Sat 10am–4pm&#10;Closed Sunday" />
      </Section>

      <Section title="9. Important Notes">
        <Textarea rows={4} value={form.important_notes}
          onChange={(v) => setForm({ ...form, important_notes: v })}
          placeholder="Anything the AI should remember..." />
      </Section>

      <div className="flex justify-end">
        <button onClick={submit} disabled={submitting}
          className="inline-flex items-center gap-2 rounded-md bg-gradient-gold px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-gold disabled:opacity-50">
          {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          Submit AI Settings Update
        </button>
      </div>

      {history.length > 0 && (
        <div className="rounded-2xl glass p-6">
          <h3 className="font-display text-lg text-gold">Submission History</h3>
          <ul className="mt-3 space-y-2">
            {history.map((s) => (
              <li key={s.id} className="flex items-center justify-between rounded-md border border-border/50 bg-background/40 p-3 text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle2 size={14} className="text-gold" />
                  {new Date(s.submitted_at).toLocaleString()}
                </span>
                <StatusBadge status={s.status} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl glass p-6">
      <h3 className="font-display text-lg text-gold">{title}</h3>
      {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Textarea({ value, onChange, rows, placeholder }: { value: string; onChange: (v: string) => void; rows: number; placeholder?: string }) {
  return (
    <textarea rows={rows} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm outline-none focus:border-gold" />
  );
}

function CheckGrid({ options, selected, onToggle }: { options: string[]; selected: string[]; onToggle: (v: string) => void }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {options.map((o) => {
        const on = selected.includes(o);
        return (
          <button key={o} type="button" onClick={() => onToggle(o)}
            className={`flex items-center gap-2 rounded-md border px-3 py-2 text-left text-sm ${on ? "border-gold/50 bg-gold/10 text-gold" : "border-border/50 bg-background/40 text-foreground"}`}>
            <span className={`flex h-4 w-4 items-center justify-center rounded border ${on ? "border-gold bg-gold/30" : "border-border"}`}>
              {on && <CheckCircle2 size={12} />}
            </span>
            {o}
          </button>
        );
      })}
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
