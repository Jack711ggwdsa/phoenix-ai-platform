import { useEffect, useState } from "react";
import { Send, MessageCircle, Instagram, Loader2, Save, Check, X, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type ChannelKey = "telegram_bot_link" | "whatsapp_link" | "messenger_link" | "instagram_link";

const CHANNELS: { key: ChannelKey; label: string; placeholder: string; icon: React.ReactNode; emptyLabel: string }[] = [
  { key: "telegram_bot_link", label: "Telegram", placeholder: "https://t.me/yourbot", icon: <Send size={16} />, emptyLabel: "Not Configured" },
  { key: "whatsapp_link",     label: "WhatsApp", placeholder: "https://wa.me/60...",   icon: <MessageCircle size={16} />, emptyLabel: "Disconnected" },
  { key: "messenger_link",    label: "Messenger", placeholder: "https://m.me/...",     icon: <MessageCircle size={16} />, emptyLabel: "Disconnected" },
  { key: "instagram_link",    label: "Instagram", placeholder: "https://instagram.com/...", icon: <Instagram size={16} />, emptyLabel: "Disconnected" },
];

export function ChannelEditor({
  clientId,
  initial,
  readOnly = false,
  onSaved,
}: {
  clientId: string;
  initial: Record<ChannelKey, string | null | undefined>;
  readOnly?: boolean;
  onSaved?: () => void;
}) {
  const [values, setValues] = useState<Record<ChannelKey, string>>({
    telegram_bot_link: initial.telegram_bot_link ?? "",
    whatsapp_link:     initial.whatsapp_link ?? "",
    messenger_link:    initial.messenger_link ?? "",
    instagram_link:    initial.instagram_link ?? "",
  });
  const [busy, setBusy] = useState<ChannelKey | null>(null);

  useEffect(() => {
    setValues({
      telegram_bot_link: initial.telegram_bot_link ?? "",
      whatsapp_link:     initial.whatsapp_link ?? "",
      messenger_link:    initial.messenger_link ?? "",
      instagram_link:    initial.instagram_link ?? "",
    });
  }, [initial.telegram_bot_link, initial.whatsapp_link, initial.messenger_link, initial.instagram_link]);

  const save = async (key: ChannelKey) => {
    setBusy(key);
    const link = values[key].trim() || null;
    // Auto-derive status field name from key (telegram has no status column originally)
    const patch: Record<string, unknown> = { [key]: link };
    if (key !== "telegram_bot_link") {
      const statusKey = key.replace("_link", "_status");
      patch[statusKey] = link ? "connected" : "disconnected";
    }
    const { error } = await supabase.from("clients").update(patch as never).eq("id", clientId);
    setBusy(null);
    if (error) toast.error(error.message);
    else { toast.success(`${CHANNELS.find((c) => c.key === key)?.label} updated`); onSaved?.(); }
  };

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {CHANNELS.map((ch) => {
        const v = values[ch.key];
        const connected = v.trim().length > 0;
        return (
          <div key={ch.key} className="rounded-xl border border-border/50 bg-background/40 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <span className="text-gold">{ch.icon}</span> {ch.label}
              </div>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] ${
                  connected ? "bg-gold/15 text-gold" : "bg-muted/30 text-muted-foreground"
                }`}
              >
                {connected ? <Check size={10} /> : <X size={10} />}
                {connected ? "Connected" : ch.emptyLabel}
              </span>
            </div>

            {readOnly ? (
              v ? (
                <a href={v} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 break-all text-xs text-gold hover:underline">
                  {v} <ExternalLink size={10} />
                </a>
              ) : (
                <p className="mt-3 text-xs text-muted-foreground">No link set.</p>
              )
            ) : (
              <>
                <input
                  value={v}
                  onChange={(e) => setValues({ ...values, [ch.key]: e.target.value })}
                  placeholder={ch.placeholder}
                  className="mt-3 w-full rounded-md border border-border bg-input px-3 py-2 text-sm outline-none focus:border-gold"
                />
                <div className="mt-2 flex justify-end">
                  <button
                    onClick={() => save(ch.key)}
                    disabled={busy === ch.key || v === (initial[ch.key] ?? "")}
                    className="inline-flex items-center gap-1 rounded-md border border-gold/40 bg-gold/10 px-3 py-1.5 text-xs text-gold disabled:opacity-50"
                  >
                    {busy === ch.key ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Save
                  </button>
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
