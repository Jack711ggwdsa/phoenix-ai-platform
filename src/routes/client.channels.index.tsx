import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Instagram,
  MessageCircle,
  Send,
  Smartphone,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/client/channels/")({
  component: ChannelsDashboard,
});

type ChannelKey = "whatsapp" | "messenger" | "instagram" | "telegram";

const CHANNELS: {
  key: ChannelKey;
  name: string;
  blurb: string;
  cta: string;
  icon: LucideIcon;
  accent: string;
}[] = [
  {
    key: "whatsapp",
    name: "WhatsApp Workspace",
    blurb: "Multi-device Baileys sessions with realtime QR pairing.",
    cta: "Open WhatsApp Workspace",
    icon: Smartphone,
    accent: "from-emerald-400/40 via-emerald-500/10 to-transparent",
  },
  {
    key: "messenger",
    name: "Messenger Workspace",
    blurb: "Pair Facebook Pages and route inbox to Phoenix.",
    cta: "Open Messenger Workspace",
    icon: MessageCircle,
    accent: "from-blue-400/40 via-cyan-500/10 to-transparent",
  },
  {
    key: "instagram",
    name: "Instagram Workspace",
    blurb: "Manage IG DMs across up to 5 connected accounts.",
    cta: "Open Instagram Workspace",
    icon: Instagram,
    accent: "from-pink-500/40 via-purple-500/10 to-transparent",
  },
  {
    key: "telegram",
    name: "Telegram Workspace",
    blurb: "Bot + user sessions with independent slot auth.",
    cta: "Open Telegram Workspace",
    icon: Send,
    accent: "from-sky-400/40 via-indigo-500/10 to-transparent",
  },
];

function ChannelsDashboard() {
  const { profile } = useAuth();
  const clientId = profile?.client_id ?? null;
  const [counts, setCounts] = useState<Record<ChannelKey, number>>({
    whatsapp: 0,
    messenger: 0,
    instagram: 0,
    telegram: 0,
  });

  useEffect(() => {
    if (!clientId) return;
    (async () => {
      const { data } = await supabase
        .from("device_connections")
        .select("platform,connection_status")
        .eq("client_id", clientId)
        .eq("connection_status", "connected");

      const next: Record<ChannelKey, number> = {
        whatsapp: 0,
        messenger: 0,
        instagram: 0,
        telegram: 0,
      };

      for (const row of data ?? []) {
        const platform = row.platform as ChannelKey;
        if (platform in next) next[platform] += 1;
      }

      setCounts(next);
    })();
  }, [clientId]);

  return (
    <div className="space-y-10">
      <header className="space-y-3">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-primary/70">
          <Sparkles className="h-3.5 w-3.5" /> Phoenix AI · Omnichannel Hub
        </div>
        <h1 className="text-3xl font-semibold text-gradient-ai sm:text-4xl">
          Channels Workspace
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          One control plane for every customer conversation channel. Open a workspace to
          manage device sessions, scan QR codes, and route inboxes into Phoenix.
        </p>
      </header>

      <div className="grid gap-5 md:grid-cols-2">
        {CHANNELS.map((channel) => {
          const Icon = channel.icon;

          return (
            <Link
              key={channel.key}
              to="/client/channels/$platform"
              params={{ platform: channel.key }}
              className={cn(
                "group relative flex flex-col gap-4 overflow-hidden rounded-3xl border border-primary/15 bg-card/40 p-6 backdrop-blur-xl transition hover:border-primary/40 hover:shadow-neon",
              )}
            >
              <div
                className={cn(
                  "pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br opacity-70",
                  channel.accent,
                )}
              />
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/30 bg-background/60 text-primary shadow-neon">
                  <Icon className="h-6 w-6" />
                </div>
                <span className="rounded-full border border-primary/20 bg-background/50 px-3 py-1 text-[11px] font-medium text-primary">
                  {counts[channel.key]} / 5 connected
                </span>
              </div>
              <div>
                <h2 className="text-xl font-semibold">{channel.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{channel.blurb}</p>
              </div>
              <div className="mt-auto inline-flex items-center gap-2 text-sm font-medium text-primary">
                {channel.cta}
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}