import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Search,
  Send,
  Paperclip,
  Sparkles,
  Tag,
  UserCircle2,
  Bot,
  MessageSquare,
  Smartphone,
  AlertTriangle,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/client/inbox/$platform/$device")({
  component: PhoenixInboxPage,
});

type DeviceRow = {
  device_slot: number;
  platform: string;
  connection_status: string;
  device_name: string | null;
  connection_name: string | null;
};

type Contact = {
  id: string;
  display_name: string | null;
  phone: string;
  last_message_preview: string | null;
  last_message_at: string | null;
  unread_count: number;
  tags: string[] | null;
  assigned_staff: string | null;
  lead_score: number | null;
};

function PhoenixInboxPage() {
  const { platform, device } = useParams({ from: "/client/inbox/$platform/$device" });
  const { profile } = useAuth();
  const clientId = profile?.client_id ?? null;

  // Parse "device-1" → 1
  const deviceSlot = (() => {
    const m = /^device-(\d+)$/i.exec(device);
    return m ? parseInt(m[1], 10) : NaN;
  })();

  const [deviceRow, setDeviceRow] = useState<DeviceRow | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selected, setSelected] = useState<Contact | null>(null);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clientId || isNaN(deviceSlot)) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const [{ data: dev }, { data: cts }] = await Promise.all([
        supabase
          .from("device_connections")
          .select("device_slot, platform, connection_status, device_name, connection_name")
          .eq("client_id", clientId)
          .eq("platform", platform)
          .eq("device_slot", deviceSlot)
          .maybeSingle(),
        platform === "whatsapp"
          ? supabase
              .from("whatsapp_contacts")
              .select(
                "id, display_name, phone, last_message_preview, last_message_at, unread_count, tags, assigned_staff, lead_score",
              )
              .eq("client_id", clientId)
              .eq("device_slot", deviceSlot)
              .order("last_message_at", { ascending: false, nullsFirst: false })
          : Promise.resolve({ data: [] as Contact[] }),
      ]);
      if (cancelled) return;
      setDeviceRow((dev as DeviceRow | null) ?? null);
      setContacts((cts as Contact[]) ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [clientId, platform, deviceSlot]);

  const isConnected = deviceRow?.connection_status === "connected";
  const filtered = contacts.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.display_name?.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q) ||
      c.last_message_preview?.toLowerCase().includes(q)
    );
  });

  if (isNaN(deviceSlot)) {
    return (
      <div className="p-8 text-sm text-rose-300">
        Invalid device path. Expected /client/inbox/{platform}/device-N.
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-primary/15 bg-background/60 px-4 py-3 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm" className="h-8 px-2 text-xs text-muted-foreground">
            <Link to="/client/channels/$platform" params={{ platform }}>
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/30 bg-background/60 text-primary">
              <Smartphone className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-primary/70">
                Phoenix Inbox · {platform}
              </p>
              <p className="text-sm font-semibold text-gradient-ai">
                {deviceRow?.device_name ?? `Device ${deviceSlot}`}
              </p>
            </div>
          </div>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "border-primary/30",
            isConnected
              ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
              : "border-orange-400/40 bg-orange-400/10 text-orange-300",
          )}
        >
          {isConnected ? "Connected" : "Backend not connected"}
        </Badge>
      </header>

      {!isConnected ? (
        <div className="flex items-start gap-3 border-b border-orange-400/30 bg-orange-400/10 px-4 py-3 text-sm text-orange-100">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-orange-300" />
          <p>
            Phoenix WhatsApp backend is not connected yet. Messages will appear here after Baileys
            backend is deployed and connected. Opening WhatsApp Web in another tab does not sync
            conversations into Phoenix.
          </p>
        </div>
      ) : null}

      <div className="grid flex-1 grid-cols-1 overflow-hidden md:grid-cols-[280px_1fr_300px]">
        {/* Conversation list */}
        <aside className="flex flex-col border-r border-primary/15 bg-card/30">
          <div className="border-b border-primary/15 p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search conversations…"
                className="pl-9"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <p className="p-4 text-xs text-muted-foreground">Loading…</p>
            ) : filtered.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-xs text-muted-foreground">
                <MessageSquare className="h-6 w-6 text-primary/40" />
                <p>No conversations yet.</p>
                <p className="text-[10px]">
                  Customer chats will appear here once the Baileys backend is connected.
                </p>
              </div>
            ) : (
              filtered.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelected(c)}
                  className={cn(
                    "flex w-full items-start gap-3 border-b border-primary/10 px-3 py-3 text-left transition hover:bg-primary/5",
                    selected?.id === c.id && "bg-primary/10",
                  )}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                    <UserCircle2 className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium">
                        {c.display_name ?? c.phone}
                      </p>
                      {c.unread_count > 0 ? (
                        <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                          {c.unread_count}
                        </span>
                      ) : null}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {c.last_message_preview ?? "—"}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        {/* Chat panel */}
        <section className="flex flex-col bg-background/40">
          {selected ? (
            <>
              <div className="border-b border-primary/15 px-4 py-3">
                <p className="text-sm font-semibold">{selected.display_name ?? selected.phone}</p>
                <p className="text-xs text-muted-foreground">{selected.phone}</p>
              </div>
              <div className="flex-1 overflow-y-auto p-6 text-sm text-muted-foreground">
                <p>Message history will appear here once backend sync is live.</p>
              </div>
              <div className="border-t border-primary/15 bg-card/30 p-3">
                <div className="flex items-center gap-2 rounded-xl border border-primary/15 bg-background/60 p-2">
                  <Button size="icon" variant="ghost" className="h-8 w-8" title="Attach">
                    <Paperclip className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" title="Media">
                    <ImageIcon className="h-4 w-4" />
                  </Button>
                  <Textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder={
                      isConnected ? "Type a message…" : "Sending disabled — backend offline"
                    }
                    disabled={!isConnected}
                    className="min-h-[40px] flex-1 resize-none border-0 bg-transparent text-sm focus-visible:ring-0"
                  />
                  <Button
                    size="icon"
                    disabled={!isConnected || !draft.trim()}
                    className="h-9 w-9 bg-gradient-neon text-primary-foreground shadow-neon"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                <p className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <Sparkles className="h-3 w-3 text-primary" /> AI reply suggestions will appear
                  here when backend is connected.
                </p>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
              Select a conversation to start chatting.
            </div>
          )}
        </section>

        {/* Customer side panel */}
        <aside className="hidden border-l border-primary/15 bg-card/30 p-4 md:block">
          {selected ? (
            <div className="space-y-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                  Customer
                </p>
                <p className="text-sm font-semibold">{selected.display_name ?? selected.phone}</p>
                <p className="text-xs text-muted-foreground">{selected.phone}</p>
              </div>
              <div>
                <p className="mb-1 flex items-center gap-1 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                  <Tag className="h-3 w-3" /> Tags
                </p>
                <div className="flex flex-wrap gap-1">
                  {(selected.tags ?? []).length === 0 ? (
                    <span className="text-xs text-muted-foreground">No tags</span>
                  ) : (
                    (selected.tags ?? []).map((t) => (
                      <Badge key={t} variant="outline" className="border-primary/30 text-xs">
                        {t}
                      </Badge>
                    ))
                  )}
                </div>
              </div>
              <div>
                <p className="mb-1 flex items-center gap-1 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                  <UserCircle2 className="h-3 w-3" /> Assigned staff
                </p>
                <p className="text-xs">{selected.assigned_staff ?? "Unassigned"}</p>
              </div>
              <div>
                <p className="mb-1 flex items-center gap-1 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                  <Bot className="h-3 w-3" /> AI suggestions
                </p>
                <p className="text-xs text-muted-foreground">
                  Suggestions stream in once backend is live.
                </p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Select a conversation to see details.</p>
          )}
        </aside>
      </div>
    </div>
  );
}
