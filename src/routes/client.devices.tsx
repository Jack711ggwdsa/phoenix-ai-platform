import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  MessageCircle,
  Send,
  Instagram,
  QrCode,
  RefreshCw,
  LogIn,
  Power,
  Loader2,
  Inbox,
  Shield,
  Activity,
  Clock,
  Smartphone,
  Sparkles,
  AlertTriangle,
  Pencil,
  type LucideIcon,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/client/devices")({ component: DevicesPage });

type PlatformKey = "whatsapp" | "messenger" | "telegram" | "instagram";
type ConnStatus =
  | "empty"
  | "pending"
  | "connecting"
  | "connected"
  | "disconnected"
  | "session_expired";

type Slot = {
  id?: string;
  platform: PlatformKey;
  device_slot: number;
  connection_status: ConnStatus;
  connection_name: string | null;
  device_name: string | null;
  last_connected_at: string | null;
  session_health: string | null;
  qr_code: string | null;
  qr_expires_at: string | null;
};

const WEBHOOK_CONNECT = "https://phoenixai.app.n8n.cloud/webhook-test/device-connect";
const WEBHOOK_DISCONNECT = "https://phoenixai.app.n8n.cloud/webhook-test/device-disconnect";
const QR_TTL_SECONDS = 20;

const SECONDARY_PLATFORMS: { key: PlatformKey; name: string; icon: LucideIcon; accent: string }[] = [
  { key: "messenger", name: "Messenger", icon: MessageCircle, accent: "from-blue-500/30 to-cyan-400/10" },
  { key: "telegram", name: "Telegram", icon: Send, accent: "from-sky-500/30 to-indigo-400/10" },
  { key: "instagram", name: "Instagram", icon: Instagram, accent: "from-pink-500/30 to-purple-400/10" },
];

const STATUS_STYLES: Record<ConnStatus, { label: string; classes: string; dot: string }> = {
  empty: {
    label: "Empty",
    classes: "border-primary/15 bg-background/40 text-muted-foreground",
    dot: "bg-muted-foreground/60",
  },
  pending: {
    label: "Waiting For Scan",
    classes: "border-yellow-400/40 bg-yellow-400/10 text-yellow-300",
    dot: "bg-yellow-400 shadow-[0_0_8px_currentColor]",
  },
  connecting: {
    label: "Connecting",
    classes: "border-cyan-400/40 bg-cyan-400/10 text-cyan-300",
    dot: "bg-cyan-400 shadow-[0_0_8px_currentColor] animate-pulse",
  },
  connected: {
    label: "Connected",
    classes: "border-emerald-400/40 bg-emerald-400/10 text-emerald-300",
    dot: "bg-emerald-400 shadow-[0_0_8px_currentColor]",
  },
  disconnected: {
    label: "Disconnected",
    classes: "border-rose-400/40 bg-rose-400/10 text-rose-300",
    dot: "bg-rose-400 shadow-[0_0_8px_currentColor]",
  },
  session_expired: {
    label: "Session Expired",
    classes: "border-orange-400/40 bg-orange-400/10 text-orange-300",
    dot: "bg-orange-400 shadow-[0_0_8px_currentColor]",
  },
};

function emptySlot(platform: PlatformKey, n: number): Slot {
  return {
    platform,
    device_slot: n,
    connection_status: "empty",
    connection_name: null,
    device_name: null,
    last_connected_at: null,
    session_health: null,
    qr_code: null,
    qr_expires_at: null,
  };
}

function buildEmptySlots(): Slot[] {
  const slots: Slot[] = [];
  const all: PlatformKey[] = ["whatsapp", "messenger", "telegram", "instagram"];
  for (const p of all) for (let i = 1; i <= 5; i++) slots.push(emptySlot(p, i));
  return slots;
}

function relativeTime(iso: string | null): string {
  if (!iso) return "Never";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function DevicesPage() {
  const { profile } = useAuth();
  const clientId = profile?.client_id ?? null;
  const [slots, setSlots] = useState<Slot[]>(() => buildEmptySlots());
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<Slot | null>(null);
  const [confirmDisconnect, setConfirmDisconnect] = useState<Slot | null>(null);
  const [renameSlot, setRenameSlot] = useState<Slot | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [busy, setBusy] = useState(false);

  // Load + seed
  useEffect(() => {
    if (!clientId) {
      setLoading(false);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("device_connections")
        .select("*")
        .eq("client_id", clientId);

      const existing = (data ?? []) as Slot[];
      const all: PlatformKey[] = ["whatsapp", "messenger", "telegram", "instagram"];
      const missing: { client_id: string; platform: PlatformKey; device_slot: number; connection_status: ConnStatus }[] = [];
      for (const p of all) {
        for (let i = 1; i <= 5; i++) {
          if (!existing.find((r) => r.platform === p && r.device_slot === i)) {
            missing.push({ client_id: clientId, platform: p, device_slot: i, connection_status: "empty" });
          }
        }
      }
      if (missing.length > 0) {
        const { data: inserted } = await supabase
          .from("device_connections")
          .insert(missing)
          .select("*");
        if (inserted) existing.push(...(inserted as Slot[]));
      }

      const base = buildEmptySlots();
      for (const row of existing) {
        const idx = base.findIndex(
          (s) => s.platform === row.platform && s.device_slot === row.device_slot,
        );
        if (idx >= 0) base[idx] = { ...base[idx], ...row };
      }
      setSlots(base);
      setLoading(false);
    })();
  }, [clientId]);

  // Realtime subscription — pick up QR + status changes from n8n
  useEffect(() => {
    if (!clientId) return;
    const ch = supabase
      .channel(`devices:${clientId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "device_connections", filter: `client_id=eq.${clientId}` },
        (payload) => {
          const row = payload.new as Slot;
          if (!row?.platform) return;
          setSlots((prev) =>
            prev.map((s) =>
              s.platform === row.platform && s.device_slot === row.device_slot
                ? { ...s, ...row }
                : s,
            ),
          );
          // If modal is open for this slot, keep it in sync
          setActive((cur) =>
            cur && cur.platform === row.platform && cur.device_slot === row.device_slot
              ? { ...cur, ...row }
              : cur,
          );
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [clientId]);

  const slotsByPlatform = useMemo(() => {
    const map: Record<PlatformKey, Slot[]> = { whatsapp: [], messenger: [], telegram: [], instagram: [] };
    for (const s of slots) map[s.platform].push(s);
    for (const k of Object.keys(map) as PlatformKey[]) map[k].sort((a, b) => a.device_slot - b.device_slot);
    return map;
  }, [slots]);

  const upsertSlot = async (next: Partial<Slot> & Pick<Slot, "platform" | "device_slot">) => {
    if (!clientId) return;
    setSlots((prev) =>
      prev.map((s) =>
        s.platform === next.platform && s.device_slot === next.device_slot ? { ...s, ...next } : s,
      ),
    );
    const { error } = await supabase
      .from("device_connections")
      .upsert(
        { client_id: clientId, ...next },
        { onConflict: "client_id,platform,device_slot" },
      );
    if (error) toast.error("Failed to save device");
  };

  const triggerScan = useCallback(
    async (slot: Slot) => {
      if (!clientId) return;
      setBusy(true);
      try {
        const res = await fetch(WEBHOOK_CONNECT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            client_id: clientId,
            platform: slot.platform,
            device_slot: slot.device_slot,
            connection_status: "pending",
          }),
        });
        if (!res.ok) {
          toast.error(`Failed to request QR (${res.status})`);
          setBusy(false);
          return;
        }
        // Optimistically clear stale QR — wait for n8n to write new one via Realtime
        await upsertSlot({
          platform: slot.platform,
          device_slot: slot.device_slot,
          connection_status: "pending",
          qr_code: null,
          qr_expires_at: null,
        });
      } catch {
        toast.error("Failed to reach connection service");
      } finally {
        setBusy(false);
      }
    },
    [clientId], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const openScan = (slot: Slot) => {
    setActive(slot);
    void triggerScan(slot);
  };

  const handleDisconnect = async (slot: Slot) => {
    setBusy(true);
    try {
      await fetch(WEBHOOK_DISCONNECT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: clientId,
          platform: slot.platform,
          device_slot: slot.device_slot,
        }),
      }).catch(() => null);
      await upsertSlot({
        platform: slot.platform,
        device_slot: slot.device_slot,
        connection_status: "empty",
        connection_name: null,
        device_name: null,
        qr_code: null,
        qr_expires_at: null,
        last_connected_at: null,
        session_health: null,
      });
      toast.success(`Slot ${slot.device_slot} disconnected`);
    } finally {
      setBusy(false);
      setConfirmDisconnect(null);
    }
  };

  const saveRename = async () => {
    if (!renameSlot) return;
    await upsertSlot({
      platform: renameSlot.platform,
      device_slot: renameSlot.device_slot,
      device_name: renameValue.trim() || null,
    });
    setRenameSlot(null);
  };

  const whatsappSlots = slotsByPlatform.whatsapp;
  const whatsappConnected = whatsappSlots.filter((s) => s.connection_status === "connected").length;

  return (
    <div className="space-y-10">
      {/* Header */}
      <header className="space-y-3">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-primary/70">
          <Sparkles className="h-3.5 w-3.5" /> Phoenix AI · Device Management
        </div>
        <h1 className="text-3xl font-semibold text-gradient-ai sm:text-4xl">
          Phoenix Secure Device Pairing
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Manage up to 5 independent WhatsApp devices for your team. Each slot runs an isolated
          session so sales, support and marketing can operate in parallel.
        </p>

        {/* Stat strip */}
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <StatPill icon={Smartphone} label="WhatsApp Devices" value={`${whatsappConnected} / 5`} />
          <StatPill icon={Activity} label="System Health" value="Operational" tone="ok" />
          <StatPill icon={Shield} label="Session Security" value="End-to-end" tone="ok" />
        </div>
      </header>

      {loading ? (
        <div className="flex h-40 items-center justify-center text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading devices…
        </div>
      ) : (
        <>
          {/* WhatsApp grid - featured */}
          <section className="space-y-4">
            <div className="flex items-end justify-between">
              <div>
                <h2 className="text-xl font-semibold text-foreground">WhatsApp Devices</h2>
                <p className="text-sm text-muted-foreground">
                  Scan to pair. Each device gets its own Phoenix inbox workspace.
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {whatsappSlots.map((slot) => (
                <DeviceCard
                  key={slot.device_slot}
                  slot={slot}
                  onScan={() => openScan(slot)}
                  onDisconnect={() => setConfirmDisconnect(slot)}
                  onRename={() => {
                    setRenameSlot(slot);
                    setRenameValue(slot.device_name ?? "");
                  }}
                />
              ))}
            </div>
          </section>

          {/* Other platforms — compact */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">Other Channels</h2>
            <div className="grid gap-3 md:grid-cols-3">
              {SECONDARY_PLATFORMS.map((p) => {
                const Icon = p.icon;
                const ps = slotsByPlatform[p.key];
                const conn = ps.filter((s) => s.connection_status === "connected").length;
                return (
                  <div
                    key={p.key}
                    className={cn(
                      "group relative overflow-hidden rounded-2xl border border-primary/15 bg-card/40 p-4 backdrop-blur-xl",
                    )}
                  >
                    <div
                      className={cn(
                        "pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br opacity-50",
                        p.accent,
                      )}
                    />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/30 bg-background/50 text-primary shadow-neon">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{p.name}</p>
                          <p className="text-[11px] text-muted-foreground">{conn}/5 connected</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-primary/30 text-xs"
                        onClick={() => {
                          const first = ps.find((s) => s.connection_status !== "connected") ?? ps[0];
                          openScan(first);
                        }}
                      >
                        <LogIn className="mr-1.5 h-3.5 w-3.5" /> Connect
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}

      {/* QR Pairing Modal */}
      <QrPairingModal
        active={active}
        busy={busy}
        onClose={() => setActive(null)}
        onRefresh={(slot) => triggerScan(slot)}
      />

      {/* Disconnect confirm */}
      <AlertDialog open={!!confirmDisconnect} onOpenChange={(o) => !o && setConfirmDisconnect(null)}>
        <AlertDialogContent className="border-rose-500/30 bg-background/95 backdrop-blur-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-rose-300">
              <AlertTriangle className="h-5 w-5" /> Disconnect this device?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Slot {confirmDisconnect?.device_slot} session will be removed. You will need to scan
              the QR code again to reconnect.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={() => confirmDisconnect && handleDisconnect(confirmDisconnect)}
              className="bg-rose-500 text-white hover:bg-rose-600"
            >
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rename device */}
      <Dialog open={!!renameSlot} onOpenChange={(o) => !o && setRenameSlot(null)}>
        <DialogContent className="border-primary/30 bg-background/95 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle>Name this device</DialogTitle>
            <DialogDescription>
              Give it a friendly label like "Sales Team" or "Support Line".
            </DialogDescription>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            placeholder="Sales Team"
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameSlot(null)}>Cancel</Button>
            <Button onClick={saveRename} className="bg-gradient-neon text-primary-foreground shadow-neon">
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ───────────────────────── Components ───────────────────────── */

function StatPill({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  tone?: "ok";
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-primary/15 bg-card/40 p-3 backdrop-blur">
      <div
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-xl border",
          tone === "ok"
            ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
            : "border-primary/30 bg-background/50 text-primary shadow-neon",
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold text-foreground">{value}</p>
      </div>
    </div>
  );
}

function DeviceCard({
  slot,
  onScan,
  onDisconnect,
  onRename,
}: {
  slot: Slot;
  onScan: () => void;
  onDisconnect: () => void;
  onRename: () => void;
}) {
  const style = STATUS_STYLES[slot.connection_status];
  const isConnected = slot.connection_status === "connected";
  const isDisconnected = slot.connection_status === "disconnected" || slot.connection_status === "session_expired";
  const health = slot.session_health ?? (isConnected ? "good" : "—");

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-primary/15 bg-card/40 p-5 backdrop-blur-xl transition-all hover:border-primary/40 hover:shadow-neon">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-emerald-500/15 via-cyan-500/10 to-primary/15 opacity-60 transition-opacity group-hover:opacity-100" />

      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative flex h-12 w-12 items-center justify-center rounded-xl border border-primary/30 bg-background/60 text-primary shadow-neon">
            <Smartphone className="h-5 w-5" />
            <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border border-primary/40 bg-background text-[10px] font-bold text-primary">
              {slot.device_slot}
            </span>
          </div>
          <div>
            <button
              type="button"
              onClick={onRename}
              className="group/edit inline-flex items-center gap-1.5 text-left text-sm font-semibold text-foreground hover:text-primary"
            >
              {slot.device_name ?? `Device Slot ${slot.device_slot}`}
              <Pencil className="h-3 w-3 opacity-0 transition group-hover/edit:opacity-100" />
            </button>
            <p className="text-[11px] text-muted-foreground">
              {slot.connection_name ?? "No session paired"}
            </p>
          </div>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium",
            style.classes,
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full", style.dot)} />
          {style.label}
        </span>
      </div>

      {/* Meta */}
      <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
        <div className="rounded-lg border border-primary/10 bg-background/40 p-2.5">
          <p className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            <Clock className="h-3 w-3" /> Last Active
          </p>
          <p className="mt-0.5 font-medium text-foreground">{relativeTime(slot.last_connected_at)}</p>
        </div>
        <div className="rounded-lg border border-primary/10 bg-background/40 p-2.5">
          <p className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            <Activity className="h-3 w-3" /> Health
          </p>
          <p
            className={cn(
              "mt-0.5 font-medium capitalize",
              health === "good" ? "text-emerald-300" : health === "—" ? "text-muted-foreground" : "text-yellow-300",
            )}
          >
            {health}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-4 flex flex-wrap gap-2">
        {isConnected ? (
          <>
            <Button
              asChild
              size="sm"
              className="flex-1 bg-gradient-neon text-primary-foreground shadow-neon hover:opacity-90"
            >
              <Link to="/client/inbox/$slot" params={{ slot: String(slot.device_slot) }}>
                <Inbox className="mr-1.5 h-3.5 w-3.5" /> Open Inbox
              </Link>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onDisconnect}
              className="border-rose-400/30 text-rose-300 hover:bg-rose-400/10"
            >
              <Power className="mr-1.5 h-3.5 w-3.5" /> Logout
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            onClick={onScan}
            className="w-full bg-gradient-neon text-primary-foreground shadow-neon hover:opacity-90"
          >
            <QrCode className="mr-1.5 h-3.5 w-3.5" />
            {isDisconnected ? "Reconnect Device" : "Scan Device"}
          </Button>
        )}
      </div>
    </div>
  );
}

function QrPairingModal({
  active,
  busy,
  onClose,
  onRefresh,
}: {
  active: Slot | null;
  busy: boolean;
  onClose: () => void;
  onRefresh: (slot: Slot) => void;
}) {
  const [remaining, setRemaining] = useState<number>(QR_TTL_SECONDS);
  const tickRef = useRef<number | null>(null);

  // Countdown driven by qr_expires_at (when n8n writes the QR)
  useEffect(() => {
    if (!active) return;
    if (tickRef.current) window.clearInterval(tickRef.current);
    const compute = () => {
      if (active.qr_expires_at) {
        const ms = new Date(active.qr_expires_at).getTime() - Date.now();
        setRemaining(Math.max(0, Math.ceil(ms / 1000)));
      } else {
        setRemaining(QR_TTL_SECONDS);
      }
    };
    compute();
    tickRef.current = window.setInterval(compute, 500);
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
    };
  }, [active]);

  if (!active) {
    return (
      <Dialog open={false} onOpenChange={() => undefined}>
        <DialogContent />
      </Dialog>
    );
  }

  const qr = active.qr_code;
  const isExpired = !!active.qr_expires_at && remaining <= 0;
  const isConnected = active.connection_status === "connected";

  return (
    <Dialog open={!!active} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-w-md overflow-hidden border-primary/30 bg-background/95 p-0 backdrop-blur-xl">
        {/* Header bar */}
        <div className="relative border-b border-primary/20 bg-gradient-to-br from-primary/15 via-purple-500/10 to-cyan-500/10 p-5">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gradient-ai">
              <Shield className="h-5 w-5 text-primary" /> Phoenix Secure Device Pairing
            </DialogTitle>
            <DialogDescription>
              Slot {active.device_slot}
              {active.device_name ? ` · ${active.device_name}` : ""} ·{" "}
              <span className="capitalize">{active.platform}</span>
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* QR area */}
        <div className="flex flex-col items-center gap-4 p-6">
          <div className="relative">
            <div className="absolute -inset-2 rounded-2xl bg-gradient-to-br from-primary/40 via-purple-500/30 to-cyan-400/40 opacity-70 blur-xl" />
            <div className="relative flex h-64 w-64 items-center justify-center rounded-2xl border border-primary/30 bg-white p-4">
              {isConnected ? (
                <div className="flex flex-col items-center gap-2 text-emerald-600">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                    <Shield className="h-8 w-8" />
                  </div>
                  <p className="text-sm font-semibold">Device Paired</p>
                </div>
              ) : qr && !isExpired ? (
                qr.startsWith("data:") || qr.startsWith("http") ? (
                  <img src={qr} alt="Phoenix pairing QR" className="h-full w-full object-contain" />
                ) : (
                  <QRCodeSVG value={qr} size={224} level="M" includeMargin={false} />
                )
              ) : isExpired ? (
                <div className="flex flex-col items-center gap-2 text-rose-500">
                  <AlertTriangle className="h-10 w-10" />
                  <p className="text-sm font-semibold">QR Expired</p>
                  <p className="text-xs text-rose-400">Refreshing…</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  <p className="text-xs">Generating secure QR code…</p>
                </div>
              )}
            </div>
            {/* corner brackets */}
            <span className="absolute -left-1 -top-1 h-4 w-4 border-l-2 border-t-2 border-primary" />
            <span className="absolute -right-1 -top-1 h-4 w-4 border-r-2 border-t-2 border-primary" />
            <span className="absolute -bottom-1 -left-1 h-4 w-4 border-b-2 border-l-2 border-primary" />
            <span className="absolute -bottom-1 -right-1 h-4 w-4 border-b-2 border-r-2 border-primary" />
          </div>

          {/* Status / timer */}
          <div className="w-full space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    isConnected
                      ? "bg-emerald-400 shadow-[0_0_8px_currentColor]"
                      : qr
                        ? "bg-cyan-400 shadow-[0_0_8px_currentColor] animate-pulse"
                        : "bg-yellow-400 shadow-[0_0_8px_currentColor] animate-pulse",
                  )}
                />
                {isConnected
                  ? "Pairing complete"
                  : qr && !isExpired
                    ? "Awaiting scan from your device"
                    : isExpired
                      ? "QR expired"
                      : "Requesting QR from secure gateway"}
              </span>
              {!isConnected && qr && !isExpired && (
                <span className="font-mono text-primary">{remaining}s</span>
              )}
            </div>
            {!isConnected && qr && !isExpired && (
              <div className="h-1 overflow-hidden rounded-full bg-background/60">
                <div
                  className="h-full bg-gradient-to-r from-primary via-purple-500 to-cyan-400 transition-all duration-500"
                  style={{ width: `${(remaining / QR_TTL_SECONDS) * 100}%` }}
                />
              </div>
            )}
          </div>

          {/* Steps */}
          {!isConnected && (
            <ol className="w-full space-y-1 rounded-xl border border-primary/15 bg-background/40 p-3 text-xs text-muted-foreground">
              <li>1. Open WhatsApp on your phone</li>
              <li>2. Tap Menu → Linked Devices → Link a Device</li>
              <li>3. Point your camera at this QR code</li>
            </ol>
          )}
        </div>

        <DialogFooter className="border-t border-primary/15 bg-background/60 p-4 sm:gap-2">
          <Button variant="outline" disabled={busy} onClick={onClose}>
            {isConnected ? "Done" : "Cancel"}
          </Button>
          {!isConnected && (
            <Button
              onClick={() => onRefresh(active)}
              disabled={busy}
              className="bg-gradient-neon text-primary-foreground shadow-neon"
            >
              {busy ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Refresh QR
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
