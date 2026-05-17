import { createFileRoute, Link, useParams, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Activity,
  AlertTriangle,
  Clock,
  ExternalLink,
  Inbox,
  Instagram,
  Loader2,
  LogIn,
  MessageCircle,
  Pencil,
  Power,
  QrCode,
  RefreshCw,
  Send,
  Shield,
  Smartphone,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import {
  requestDeviceSession,
  disconnectDeviceSession,
} from "@/lib/device-sessions.functions";

export const Route = createFileRoute("/client/channels/$platform")({
  component: ChannelWorkspacePage,
});

type PlatformKey = "whatsapp" | "messenger" | "telegram" | "instagram";
type ConnStatus =
  | "empty"
  | "pending"
  | "connecting"
  | "connected"
  | "disconnected"
  | "session_expired";

type Slot = {
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

const META: Record<
  PlatformKey,
  { name: string; icon: LucideIcon; tagline: string; supported: boolean }
> = {
  whatsapp: {
    name: "WhatsApp Workspace",
    icon: Smartphone,
    tagline: "Independent Baileys sessions · realtime QR pairing",
    supported: true,
  },
  messenger: {
    name: "Messenger Workspace",
    icon: MessageCircle,
    tagline: "Connect Facebook Pages and route inbox to Phoenix",
    supported: false,
  },
  instagram: {
    name: "Instagram Workspace",
    icon: Instagram,
    tagline: "Manage IG DMs across multiple business accounts",
    supported: false,
  },
  telegram: {
    name: "Telegram Workspace",
    icon: Send,
    tagline: "Bot and user sessions with independent slot auth",
    supported: false,
  },
};

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

function relativeTime(iso: string | null): string {
  if (!iso) return "Never";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function ChannelWorkspacePage() {
  const { platform: platformParam } = useParams({ from: "/client/channels/$platform" });
  const navigate = useNavigate();
  const platform = platformParam as PlatformKey;
  const meta = META[platform];

  useEffect(() => {
    if (!meta) navigate({ to: "/client/channels" });
  }, [meta, navigate]);

  if (!meta) return null;

  return <Workspace platform={platform} />;
}

function Workspace({ platform }: { platform: PlatformKey }) {
  const { profile } = useAuth();
  const clientId = profile?.client_id ?? null;
  const meta = META[platform];
  const Icon = meta.icon;
  const sessionServiceUrl = (import.meta.env.VITE_SESSION_SERVICE_URL as string | undefined)?.trim();
  const hasSessionService = Boolean(sessionServiceUrl);

  const callRequestSession = useServerFn(requestDeviceSession);
  const callDisconnect = useServerFn(disconnectDeviceSession);

  const [slots, setSlots] = useState<Slot[]>(() =>
    Array.from({ length: 5 }, (_, i) => emptySlot(platform, i + 1)),
  );
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<Slot | null>(null);
  const [pairingError, setPairingError] = useState<string | null>(null);
  const [pairingRequested, setPairingRequested] = useState(false);
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
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("device_connections")
        .select("*")
        .eq("client_id", clientId)
        .eq("platform", platform);

      const existing = (data ?? []) as Slot[];
      const missing: { client_id: string; platform: PlatformKey; device_slot: number; connection_status: ConnStatus }[] = [];
      for (let i = 1; i <= 5; i++) {
        if (!existing.find((r) => r.device_slot === i)) {
          missing.push({
            client_id: clientId,
            platform,
            device_slot: i,
            connection_status: "empty",
          });
        }
      }
      if (missing.length > 0) {
        const { data: inserted } = await supabase
          .from("device_connections")
          .insert(missing)
          .select("*");
        if (inserted) existing.push(...(inserted as Slot[]));
      }

      if (cancelled) return;
      const base = Array.from({ length: 5 }, (_, i) => emptySlot(platform, i + 1));
      for (const row of existing) {
        const idx = base.findIndex((s) => s.device_slot === row.device_slot);
        if (idx >= 0) base[idx] = { ...base[idx], ...row };
      }
      setSlots(base);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [clientId, platform]);

  // Realtime
  useEffect(() => {
    if (!clientId) return;
    const ch = supabase
      .channel(`devices:${clientId}:${platform}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "device_connections",
          filter: `client_id=eq.${clientId}`,
        },
        (payload) => {
          const row = payload.new as Slot;
          if (!row?.platform || row.platform !== platform) return;
          setSlots((prev) =>
            prev.map((s) => (s.device_slot === row.device_slot ? { ...s, ...row } : s)),
          );
          setActive((cur) =>
            cur && cur.device_slot === row.device_slot ? { ...cur, ...row } : cur,
          );
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [clientId, platform]);

  // Optional Socket.IO bridge for a live Node session service
  useSessionSocket({
    enabled: !!clientId && meta.supported && hasSessionService,
    clientId,
    platform,
    onSlotUpdate: (next) =>
      setSlots((prev) =>
        prev.map((s) => (s.device_slot === next.device_slot ? { ...s, ...next } : s)),
      ),
  });

  const triggerScan = useCallback(
    async (slot: Slot) => {
      if (!clientId) {
        toast.error("Sign in required");
        return;
      }
      setPairingRequested(true);
      setPairingError(null);
      setBusy(true);
      try {
        const result = await callRequestSession({
          data: { platform: slot.platform, deviceSlot: slot.device_slot },
        });
        if (!result.ok) {
          const msg =
            result.code === "config_missing"
              ? result.message
              : result.code === "upstream_error"
                ? `Session service returned an error. ${result.detail ?? ""}`
                : result.code === "network"
                  ? "Failed to reach connection service"
                  : result.message;
          setPairingError(msg);
          setPairingRequested(false);
          toast.error(msg);
        } else {
          setPairingError(null);
          toast.success("Pairing requested — waiting for QR…");
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to start pairing session.";
        setPairingError(message);
        setPairingRequested(false);
        toast.error(message);
      } finally {
        setBusy(false);
      }
    },
    [callRequestSession, clientId],
  );

  useEffect(() => {
    if (!active) return;
    if (active.qr_code || active.connection_status === "connected") {
      setPairingRequested(false);
      setPairingError(null);
      return;
    }
    if (active.connection_status === "disconnected" || active.connection_status === "session_expired") {
      setPairingRequested(false);
    }
  }, [active]);

  const openScan = (slot: Slot) => {
    if (!meta.supported) {
      toast.info(`${meta.name} pairing is coming soon.`);
      return;
    }
    if (!hasSessionService) {
      toast.error(
        "WhatsApp session service is not configured yet. Please connect external Node.js Baileys backend.",
      );
      return;
    }
    setPairingError(null);
    setPairingRequested(true);
    setActive(slot);
    void triggerScan(slot);
  };

  const handleDisconnect = async (slot: Slot) => {
    setBusy(true);
    try {
      const result = await callDisconnect({
        data: { platform: slot.platform, deviceSlot: slot.device_slot },
      });
      if (!result.ok) toast.error(result.message ?? "Failed to disconnect");
      else toast.success(`Slot ${slot.device_slot} disconnected`);
    } finally {
      setBusy(false);
      setConfirmDisconnect(null);
    }
  };

  const saveRename = async () => {
    if (!renameSlot || !clientId) return;
    const trimmed = renameValue.trim() || null;
    setSlots((prev) =>
      prev.map((s) =>
        s.device_slot === renameSlot.device_slot ? { ...s, device_name: trimmed } : s,
      ),
    );
    await supabase
      .from("device_connections")
      .upsert(
        {
          client_id: clientId,
          platform: renameSlot.platform,
          device_slot: renameSlot.device_slot,
          device_name: trimmed,
        },
        { onConflict: "client_id,platform,device_slot" },
      );
    setRenameSlot(null);
  };

  const connected = slots.filter((s) => s.connection_status === "connected").length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="space-y-4">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs text-muted-foreground hover:text-primary"
        >
          <Link to="/client/channels">
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back to channels
          </Link>
        </Button>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-primary/70">
              <Sparkles className="h-3.5 w-3.5" /> Phoenix AI · Session Manager
            </div>
            <div className="mt-2 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/30 bg-background/60 text-primary shadow-neon">
                <Icon className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-3xl font-semibold text-gradient-ai">{meta.name}</h1>
                <p className="text-sm text-muted-foreground">{meta.tagline}</p>
              </div>
            </div>
          </div>
          <div className="grid w-full grid-cols-3 gap-3 sm:w-auto">
            <StatPill icon={Smartphone} label="Connected" value={`${connected} / 5`} />
            <StatPill
              icon={Activity}
              label="Service"
              value={meta.supported ? (hasSessionService ? "Configured" : "Not configured") : "Coming soon"}
              tone={meta.supported && hasSessionService ? "ok" : undefined}
            />
            <StatPill icon={Shield} label="Sessions" value="Isolated" tone="ok" />
          </div>
        </div>
      </header>

      {platform === "whatsapp" ? (
        <div className="grid gap-2 rounded-2xl border border-primary/15 bg-card/40 p-4 text-xs backdrop-blur-xl sm:grid-cols-3">
          <StrategyPill
            label="External WhatsApp Web"
            value="Manual only"
            tone="muted"
            hint="Opens web.whatsapp.com in a new tab. Does NOT connect Phoenix."
          />
          <StrategyPill
            label="Phoenix Backend"
            value={hasSessionService ? "Configured" : "Not Connected"}
            tone={hasSessionService ? "ok" : "warn"}
            hint={
              hasSessionService
                ? "Node.js Baileys session service reachable."
                : "Deploy external Node.js Baileys backend, then set VITE_SESSION_SERVICE_URL."
            }
          />
          <StrategyPill
            label="Phoenix Inbox"
            value={hasSessionService ? "Available after pairing" : "Disabled until backend connected"}
            tone={hasSessionService ? "ok" : "warn"}
            hint="Inbox activates only after a device shows Connected via Phoenix QR."
          />
        </div>
      ) : null}

      {platform === "whatsapp" && !hasSessionService ? (
        <div className="flex items-start gap-3 rounded-2xl border border-orange-400/30 bg-orange-400/10 px-4 py-3 text-sm text-orange-100">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-orange-300" />
          <p>
            Phoenix backend not connected. Deploy external Node.js Baileys backend first, then
            set <code className="rounded bg-background/40 px-1">VITE_SESSION_SERVICE_URL</code>{" "}
            in project env. See{" "}
            <code className="rounded bg-background/40 px-1">services/whatsapp-session/DEPLOYMENT.md</code>.
          </p>
        </div>
      ) : null}

      {loading ? (
        <div className="flex h-40 items-center justify-center text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading devices…
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {slots.map((slot) => (
            <DeviceCard
              key={slot.device_slot}
              slot={slot}
              platform={platform}
              hasSessionService={hasSessionService}
              onScan={() => openScan(slot)}
              onDisconnect={() => setConfirmDisconnect(slot)}
              onRename={() => {
                setRenameSlot(slot);
                setRenameValue(slot.device_name ?? "");
              }}
            />
          ))}
        </div>
      )}

      <QrPairingModal
        active={active}
        busy={busy}
        errorMessage={pairingError}
        pairingRequested={pairingRequested}
        onClose={() => {
          setActive(null);
          setPairingError(null);
          setPairingRequested(false);
        }}
        onRefresh={(slot) => triggerScan(slot)}
      />

      <AlertDialog
        open={!!confirmDisconnect}
        onOpenChange={(o) => !o && setConfirmDisconnect(null)}
      >
        <AlertDialogContent className="border-rose-500/30 bg-background/95 backdrop-blur-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-rose-300">
              <AlertTriangle className="h-5 w-5" /> Disconnect this device?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Slot {confirmDisconnect?.device_slot} session will be cleared. You will need
              to scan the QR code again to reconnect.
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
            <Button variant="outline" onClick={() => setRenameSlot(null)}>
              Cancel
            </Button>
            <Button
              onClick={saveRename}
              className="bg-gradient-neon text-primary-foreground shadow-neon"
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

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
    <div
      className={cn(
        "flex items-center gap-2 rounded-2xl border border-primary/15 bg-card/40 px-3 py-2 backdrop-blur-xl",
      )}
    >
      <Icon
        className={cn(
          "h-4 w-4 text-primary",
          tone === "ok" && "text-emerald-400",
        )}
      />
      <div className="leading-tight">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}

function StrategyPill({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: string;
  tone: "ok" | "warn" | "muted";
  hint: string;
}) {
  const toneClasses =
    tone === "ok"
      ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200"
      : tone === "warn"
        ? "border-orange-400/40 bg-orange-400/10 text-orange-200"
        : "border-primary/20 bg-background/40 text-muted-foreground";
  return (
    <div className={cn("rounded-xl border px-3 py-2", toneClasses)}>
      <p className="text-[10px] uppercase tracking-[0.25em] opacity-80">{label}</p>
      <p className="mt-0.5 text-sm font-semibold">{value}</p>
      <p className="mt-1 text-[11px] leading-snug opacity-80">{hint}</p>
    </div>
  );
}

function DeviceCard({
  slot,
  platform,
  hasSessionService,
  onScan,
  onDisconnect,
  onRename,
}: {
  slot: Slot;
  platform: PlatformKey;
  hasSessionService: boolean;
  onScan: () => void;
  onDisconnect: () => void;
  onRename: () => void;
}) {
  const status = STATUS_STYLES[slot.connection_status];
  const isConnected = slot.connection_status === "connected";
  const isWhatsapp = platform === "whatsapp";
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-primary/15 bg-card/40 p-5 backdrop-blur-xl transition hover:border-primary/40">
      <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-gradient-to-br from-primary/20 to-transparent blur-2xl" />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            Device
          </p>
          <p className="text-2xl font-semibold text-gradient-ai">{slot.device_slot}</p>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium",
            status.classes,
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full", status.dot)} />
          {status.label}
        </span>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <p className="truncate text-sm font-medium">
          {slot.device_name ?? <span className="text-muted-foreground">Unnamed device</span>}
        </p>
        <button
          onClick={onRename}
          className="text-muted-foreground transition hover:text-primary"
          title="Rename"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </div>
      <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
        <Clock className="h-3 w-3" /> Last active {relativeTime(slot.last_connected_at)}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {isConnected ? (
          <>
            <Button
              asChild
              size="sm"
              className="bg-gradient-neon text-primary-foreground shadow-neon"
            >
              <Link
                to="/client/inbox/$platform/$device"
                params={{ platform, device: `device-${slot.device_slot}` }}
              >
                <Inbox className="mr-1.5 h-3.5 w-3.5" /> Open Phoenix Inbox
              </Link>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onDisconnect}
              className="border-rose-400/40 text-rose-300 hover:bg-rose-500/10"
            >
              <Power className="mr-1.5 h-3.5 w-3.5" /> Disconnect
            </Button>
          </>
        ) : (
          <>
            {isWhatsapp ? (
              <Button
                asChild
                size="sm"
                variant="outline"
                className="border-emerald-400/40 text-emerald-300 hover:bg-emerald-500/10"
              >
                <a
                  href="https://web.whatsapp.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="External login only — does not connect Phoenix"
                >
                  <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Open WhatsApp Web
                </a>
              </Button>
            ) : null}
            <Button
              size="sm"
              onClick={onScan}
              disabled={isWhatsapp && !hasSessionService}
              title={
                isWhatsapp && !hasSessionService
                  ? "Phoenix QR Connect requires external Node.js Baileys backend. Please deploy backend first."
                  : "Real Phoenix CRM connection with inbox sync"
              }
              className="bg-gradient-neon text-primary-foreground shadow-neon disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <QrCode className="mr-1.5 h-3.5 w-3.5" /> Connect to Phoenix Inbox
            </Button>
          </>
        )}
      </div>
      {isWhatsapp && !isConnected ? (
        <div className="mt-3 space-y-2 text-[11px] leading-relaxed text-muted-foreground">
          <p>
            <span className="font-medium text-emerald-300">Open WhatsApp Web</span> — external
            manual login only. Does NOT connect Phoenix, does NOT sync messages or update device
            status.
          </p>
          <p>
            <span className={cn("font-medium", hasSessionService ? "text-primary" : "text-orange-300")}>
              Connect to Phoenix Inbox
            </span>{" "}
            — real CRM connection. Generates Phoenix QR, syncs customer chats, enables sending
            replies, and updates device status to Connected.
            {!hasSessionService ? " Requires external Node.js Baileys backend." : null}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function QrPairingModal({
  active,
  busy,
  errorMessage,
  pairingRequested,
  onClose,
  onRefresh,
}: {
  active: Slot | null;
  busy: boolean;
  errorMessage: string | null;
  pairingRequested: boolean;
  onClose: () => void;
  onRefresh: (slot: Slot) => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!active) return null;
  const expiresIn = active.qr_expires_at
    ? Math.max(0, Math.floor((new Date(active.qr_expires_at).getTime() - now) / 1000))
    : null;
  const expired = expiresIn !== null && expiresIn <= 0;
  const isConnected = active.connection_status === "connected";

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md border-primary/30 bg-background/95 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-gradient-ai">
            <Sparkles className="h-4 w-4" /> Phoenix Secure Device Pairing
          </DialogTitle>
          <DialogDescription>
            Open WhatsApp → Linked Devices → Link a Device, then scan below. Slot{" "}
            {active.device_slot}.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-center py-2">
          <div className="relative flex h-64 w-64 items-center justify-center rounded-2xl border border-primary/30 bg-background/60 p-3 shadow-neon">
            {isConnected ? (
              <div className="text-center">
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300">
                  <Shield className="h-6 w-6" />
                </div>
                <p className="font-medium text-emerald-300">Connected</p>
              </div>
            ) : expired ? (
              <div className="text-center text-muted-foreground">
                <AlertTriangle className="mx-auto mb-2 h-6 w-6 text-orange-400" />
                <p>QR expired</p>
              </div>
            ) : active.qr_code ? (
              <QRCodeSVG
                value={active.qr_code}
                size={232}
                bgColor="transparent"
                fgColor="#e0f2fe"
              />
            ) : errorMessage ? (
              <div className="space-y-2 text-center text-muted-foreground">
                <AlertTriangle className="mx-auto h-6 w-6 text-rose-300" />
                <p className="text-sm text-foreground">{errorMessage}</p>
              </div>
            ) : pairingRequested || busy ? (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <p className="text-xs">Waiting for real QR Code from session service…</p>
              </div>
            ) : (
              <div className="space-y-2 text-center text-muted-foreground">
                <QrCode className="mx-auto h-6 w-6 text-primary" />
                <p className="text-xs">Click Request new QR to start device pairing.</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Activity className="h-3 w-3" />
            Status: {STATUS_STYLES[active.connection_status].label}
          </span>
          {expiresIn !== null && !isConnected && (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" /> Refresh in {expiresIn}s
            </span>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {!isConnected && (
            <Button
              disabled={busy}
              onClick={() => onRefresh(active)}
              className="bg-gradient-neon text-primary-foreground shadow-neon"
            >
              {busy ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Request new QR
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Optional Socket.IO bridge to a Node Baileys session service.
 *
 * Activates only when `VITE_SESSION_SERVICE_URL` is configured at build time.
 * Subscribes to per-client/platform rooms and forwards `qr-update`,
 * `session-connected`, `session-disconnected`, `session-expired` events into
 * the local slot state.
 */
function useSessionSocket({
  enabled,
  clientId,
  platform,
  onSlotUpdate,
}: {
  enabled: boolean;
  clientId: string | null;
  platform: PlatformKey;
  onSlotUpdate: (slot: Partial<Slot> & { device_slot: number }) => void;
}) {
  const onUpdateRef = useRef(onSlotUpdate);
  onUpdateRef.current = onSlotUpdate;

  useEffect(() => {
    const url = import.meta.env.VITE_SESSION_SERVICE_URL as string | undefined;
    if (!enabled || !clientId || !url) return;

    let cleanup: (() => void) | undefined;
    let cancelled = false;

    (async () => {
      const { io } = await import("socket.io-client");
      if (cancelled) return;
      const socket = io(url, {
        transports: ["websocket"],
        query: { clientId, platform },
        withCredentials: false,
      });

      socket.on("qr-update", (msg: { device_slot: number; qr_code: string; qr_expires_at: string }) =>
        onUpdateRef.current({
          device_slot: msg.device_slot,
          qr_code: msg.qr_code,
          qr_expires_at: msg.qr_expires_at,
          connection_status: "pending",
        }),
      );
      socket.on("session-connected", (msg: { device_slot: number; device_name?: string }) =>
        onUpdateRef.current({
          device_slot: msg.device_slot,
          connection_status: "connected",
          qr_code: null,
          qr_expires_at: null,
          last_connected_at: new Date().toISOString(),
          device_name: msg.device_name ?? null,
          session_health: "ok",
        }),
      );
      socket.on("session-disconnected", (msg: { device_slot: number }) =>
        onUpdateRef.current({
          device_slot: msg.device_slot,
          connection_status: "disconnected",
        }),
      );
      socket.on("session-expired", (msg: { device_slot: number }) =>
        onUpdateRef.current({
          device_slot: msg.device_slot,
          connection_status: "session_expired",
        }),
      );

      cleanup = () => socket.disconnect();
    })();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [enabled, clientId, platform]);
}
