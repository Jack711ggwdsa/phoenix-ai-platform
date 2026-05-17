import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Trash2, Archive, Check, X, Eye, Pencil } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/activity")({ component: ActivityPage });

const CHECKLIST: { key: ChecklistKey; label: string }[] = [
  { key: "checklist_info_reviewed",     label: "Info reviewed" },
  { key: "checklist_prompt_updated",    label: "Prompt updated" },
  { key: "checklist_n8n_updated",       label: "n8n workflow updated" },
  { key: "checklist_ai_tested",         label: "AI reply tested" },
  { key: "checklist_confirmation_sent", label: "Confirmation sent to client" },
];
type ChecklistKey =
  | "checklist_info_reviewed" | "checklist_prompt_updated" | "checklist_n8n_updated"
  | "checklist_ai_tested" | "checklist_confirmation_sent";

const FIELDS_SETUP: { key: string; label: string }[] = [
  { key: "ai_business_info",   label: "AI Business Info" },
  { key: "ai_prompt",          label: "AI Reply Instruction" },
  { key: "preferred_language", label: "Preferred Language" },
  { key: "service_pricing",    label: "Service Pricing" },
  { key: "promotion",          label: "Promotion" },
  { key: "faq",                label: "FAQ" },
  { key: "other_notes",        label: "Other Notes" },
];

const FIELDS_AI_SETTINGS: { key: string; label: string }[] = [
  { key: "business_information",  label: "Business Information" },
  { key: "services_products",     label: "Services / Products" },
  { key: "promotion",             label: "Promotions" },
  { key: "faq",                   label: "FAQ" },
  { key: "ai_reply_style",        label: "AI Reply Style" },
  { key: "preferred_languages",   label: "Preferred Language" },
  { key: "lead_collection_rules", label: "Lead Collection Rules" },
  { key: "business_hours",        label: "Business Hours" },
  { key: "important_notes",       label: "Important Notes" },
];

function fieldsFor(sub: any) {
  return sub?.submission_kind === "ai_settings" ? FIELDS_AI_SETTINGS : FIELDS_SETUP;
}

type Filter = "new" | "in_progress" | "completed" | "archived" | "all";

function ActivityPage() {
  const [rows, setRows] = useState<any[] | null>(null);
  const [filter, setFilter] = useState<Filter>("new");
  const [open, setOpen] = useState<any | null>(null);

  const load = async () => {
    const { data, error } = await supabase
      .from("client_submissions").select("*").order("submitted_at", { ascending: false });
    if (error) { toast.error(error.message); setRows([]); return; }
    setRows(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    if (!rows) return [];
    if (filter === "archived") return rows.filter((r) => r.archived_at);
    if (filter === "all") return rows;
    return rows.filter((r) => !r.archived_at && r.status === filter);
  }, [rows, filter]);

  const counts = useMemo(() => {
    const r = rows ?? [];
    return {
      new: r.filter((x) => !x.archived_at && x.status === "new").length,
      in_progress: r.filter((x) => !x.archived_at && x.status === "in_progress").length,
      completed: r.filter((x) => !x.archived_at && x.status === "completed").length,
      archived: r.filter((x) => x.archived_at).length,
      all: r.length,
    };
  }, [rows]);

  const update = async (id: string, patch: any) => {
    const { error } = await supabase.from("client_submissions").update(patch as never).eq("id", id);
    if (error) { toast.error(error.message); return; }
    setRows((prev) => (prev ?? []).map((r) => r.id === id ? { ...r, ...patch } : r));
    if (open?.id === id) setOpen({ ...open, ...patch });
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this submission permanently?")) return;
    const { error } = await supabase.from("client_submissions").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setRows((prev) => (prev ?? []).filter((r) => r.id !== id));
    if (open?.id === id) setOpen(null);
    toast.success("Deleted");
  };

  const archive = async (id: string, archived: boolean) => {
    await update(id, { archived_at: archived ? new Date().toISOString() : null });
  };

  const markDone = async (id: string, done: boolean) => {
    await update(id, {
      checklist_info_reviewed: done,
      checklist_prompt_updated: done,
      checklist_n8n_updated: done,
      checklist_ai_tested: done,
      checklist_confirmation_sent: done,
      status: done ? "completed" : "in_progress",
    });
  };

  if (!rows) return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-gold" /></div>;

  return (
    <div>
      <div className="mb-4">
        <h1 className="font-display text-3xl text-gradient-gold">Client submissions</h1>
        <p className="mt-1 text-sm text-muted-foreground">AI Setup Information &amp; AI Settings Updates — one card per submitted package.</p>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {(["new","in_progress","completed","archived","all"] as Filter[]).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${filter === f ? "border-gold bg-gold/15 text-gold" : "border-border text-muted-foreground hover:border-gold/40"}`}>
            <span className="capitalize">{f === "in_progress" ? "In Progress" : f}</span>
            <span className="rounded-full bg-background/50 px-1.5 text-[10px]">{counts[f]}</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl glass p-12 text-center text-muted-foreground">No submissions in this view.</div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((s) => {
            const doneCount = CHECKLIST.filter((c) => s[c.key]).length;
            const summary = (s.business_information || s.ai_business_info || s.services_products || s.ai_prompt || s.service_pricing || s.faq || "").toString().slice(0, 140);
            const kindLabel = s.submission_kind === "ai_settings" ? "AI Settings" : "AI Setup";
            return (
              <div key={s.id} className="rounded-xl glass p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{s.client_name ?? "—"}</span>
                      <span className="rounded-full border border-gold/30 bg-gold/5 px-2 py-0.5 text-[10px] uppercase tracking-widest text-gold">{kindLabel}</span>
                      <StatusBadge status={s.status} archived={!!s.archived_at} />
                    </div>
                    <div className="text-xs text-muted-foreground">{s.client_email ?? ""}</div>
                    <div className="mt-1 text-xs text-muted-foreground">Submitted {new Date(s.submitted_at).toLocaleString()}</div>
                    {summary && <div className="mt-2 line-clamp-2 text-sm text-foreground/80">{summary}</div>}
                    <div className="mt-2 text-xs text-muted-foreground">Checklist {doneCount}/{CHECKLIST.length}</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs">
                      <input type="checkbox" checked={s.status === "completed"} onChange={(e) => markDone(s.id, e.target.checked)} />
                      Mark done
                    </label>
                    <button onClick={() => setOpen(s)} className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:border-gold hover:text-gold">
                      <Eye size={12} /> View Details
                    </button>
                    <Link to="/admin/clients/$id" params={{ id: s.client_id }} className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:border-gold hover:text-gold">
                      <Pencil size={12} /> Open client
                    </Link>
                    <button onClick={() => archive(s.id, !s.archived_at)} className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:border-gold hover:text-gold">
                      <Archive size={12} /> {s.archived_at ? "Unarchive" : "Archive"}
                    </button>
                    <button onClick={() => remove(s.id)} className="inline-flex items-center gap-1 rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1 text-xs text-destructive">
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {open && (
        <DetailModal sub={open} onClose={() => setOpen(null)} onUpdate={(patch) => update(open.id, patch)} />
      )}
    </div>
  );
}

function DetailModal({ sub, onClose, onUpdate }: { sub: any; onClose: () => void; onUpdate: (p: any) => void }) {
  const [notes, setNotes] = useState(sub.admin_notes ?? "");
  const doneCount = CHECKLIST.filter((c) => sub[c.key]).length;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="my-8 w-full max-w-3xl rounded-2xl glass p-6 shadow-elegant">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="font-display text-xl text-gradient-gold">{sub.client_name}</h2>
            <p className="text-xs text-muted-foreground">{sub.client_email} · Submitted {new Date(sub.submitted_at).toLocaleString()}</p>
          </div>
          <div className="flex items-center gap-2">
            <select value={sub.status} onChange={(e) => onUpdate({ status: e.target.value })}
              className="rounded-md border border-border bg-input px-3 py-1.5 text-sm">
              <option value="new">New</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
            <button onClick={onClose} className="rounded-md border border-border px-2 py-1 text-xs"><X size={12} /></button>
          </div>
        </div>

        <div className="mt-2 text-[11px] uppercase tracking-wider text-muted-foreground">
          {sub.submission_kind === "ai_settings" ? "AI Settings Update" : "AI Setup Information"}
        </div>
        <div className="mt-2 grid gap-3">
          {fieldsFor(sub).map((f) => {
            const raw = sub[f.key];
            const display = Array.isArray(raw) ? (raw.length ? raw.join(", ") : "") : raw;
            return (
              <div key={f.key} className="rounded-md border border-border/40 bg-background/40 p-3">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{f.label}</div>
                <div className="mt-1 whitespace-pre-wrap text-sm text-foreground">{display || <span className="text-muted-foreground">—</span>}</div>
              </div>
            );
          })}
        </div>


        <div className="mt-4 rounded-xl border border-gold/20 bg-gold/5 p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm uppercase tracking-widest text-gold">Checklist</h3>
            <span className="text-xs text-muted-foreground">{doneCount}/{CHECKLIST.length} completed</span>
          </div>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {CHECKLIST.map((c) => (
              <li key={c.key}>
                <button onClick={() => onUpdate({ [c.key]: !sub[c.key] })}
                  className={`flex w-full items-center gap-2 rounded-md border px-3 py-2 text-sm ${sub[c.key] ? "border-gold/40 bg-gold/10 text-gold" : "border-border/50 bg-background/40"}`}>
                  <span className={`flex h-4 w-4 items-center justify-center rounded border ${sub[c.key] ? "border-gold bg-gold/30" : "border-border"}`}>
                    {sub[c.key] && <Check size={12} />}
                  </span>
                  {c.label}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-4">
          <label className="text-xs uppercase tracking-wider text-muted-foreground">Admin notes</label>
          <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)}
            onBlur={() => { if (notes !== (sub.admin_notes ?? "")) onUpdate({ admin_notes: notes }); }}
            className="mt-1 w-full rounded-md border border-border bg-input px-3 py-2 text-sm outline-none focus:border-gold" />
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status, archived }: { status: string; archived: boolean }) {
  if (archived) return <span className="inline-flex items-center rounded-full bg-muted/30 px-2 py-0.5 text-[11px] text-muted-foreground">Archived</span>;
  const map: Record<string, string> = {
    new: "bg-gold/15 text-gold",
    in_progress: "bg-blue-500/15 text-blue-400",
    completed: "bg-green-500/15 text-green-400",
  };
  const label = status === "in_progress" ? "In Progress" : status[0].toUpperCase() + status.slice(1);
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] ${map[status] ?? "bg-muted/30 text-muted-foreground"}`}>{label}</span>;
}
