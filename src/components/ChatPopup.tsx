import { Check, CheckCheck, Phone } from "lucide-react";

type Platform = "whatsapp" | "instagram" | "messenger" | "telegram";

const PLATFORM_META: Record<Platform, { name: string; color: string; tint: string }> = {
  whatsapp:  { name: "WhatsApp",  color: "oklch(0.78 0.16 155)", tint: "from-emerald-500/20" },
  instagram: { name: "Instagram", color: "oklch(0.72 0.22 305)", tint: "from-fuchsia-500/20" },
  messenger: { name: "Messenger", color: "oklch(0.78 0.18 250)", tint: "from-sky-500/20" },
  telegram:  { name: "Telegram",  color: "oklch(0.78 0.16 220)", tint: "from-cyan-500/20" },
};

export interface ChatPopupProps {
  platform: Platform;
  avatar: string;            // single character / emoji
  name: string;
  verified?: boolean;
  customer: string;          // customer message
  reply: string;             // ai reply
  className?: string;
  style?: React.CSSProperties;
  delay?: number;
}

export function ChatPopup({
  platform, avatar, name, verified = true, customer, reply, className = "", style, delay = 0,
}: ChatPopupProps) {
  const meta = PLATFORM_META[platform];
  return (
    <div
      className={`holo-card animate-rise w-[260px] p-3 shadow-elegant ${className}`}
      style={{ animationDelay: `${delay}s`, ...style }}
    >
      {/* header */}
      <div className="flex items-center gap-2">
        <div className="relative flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold text-primary-foreground"
             style={{ background: `linear-gradient(135deg, ${meta.color}, var(--neon-2))` }}>
          {avatar}
          <span className="absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full border border-background bg-emerald-400" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 text-[12px] font-medium leading-none">
            <span className="truncate">{name}</span>
            {verified && (
              <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full"
                    style={{ background: meta.color }}>
                <Check size={9} className="text-background" strokeWidth={4} />
              </span>
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
            <span className="live-dot" /> {meta.name} · AI live
          </div>
        </div>
        {platform === "telegram" && <Phone size={12} className="text-muted-foreground" />}
      </div>

      {/* customer */}
      <div className="mt-2.5 max-w-[85%] rounded-2xl rounded-bl-sm bg-secondary/70 px-3 py-1.5 text-[12px] leading-snug text-foreground/90">
        {customer}
      </div>

      {/* typing then reply */}
      <div className="mt-1.5 flex justify-end">
        <div className="max-w-[88%] rounded-2xl rounded-br-sm bg-gradient-neon px-3 py-1.5 text-[12px] leading-snug text-primary-foreground shadow-neon">
          {reply}
          <div className="mt-0.5 flex items-center justify-end gap-1 text-[9px] text-primary-foreground/80">
            AI · just now <CheckCheck size={10} strokeWidth={3} />
          </div>
        </div>
      </div>

      {/* typing dots */}
      <div className="mt-1.5 flex items-center gap-1 pl-1 text-[10px] text-muted-foreground">
        <span className="typing-dot inline-block h-1 w-1 rounded-full bg-muted-foreground" style={{ animationDelay: "0s" }} />
        <span className="typing-dot inline-block h-1 w-1 rounded-full bg-muted-foreground" style={{ animationDelay: "0.2s" }} />
        <span className="typing-dot inline-block h-1 w-1 rounded-full bg-muted-foreground" style={{ animationDelay: "0.4s" }} />
        <span>customer typing…</span>
      </div>
    </div>
  );
}
