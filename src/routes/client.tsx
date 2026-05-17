import { createFileRoute, Outlet, Link } from "@tanstack/react-router";
import { DashboardShell } from "@/components/DashboardShell";
import { LayoutDashboard, Sparkles, Smartphone, MessagesSquare } from "lucide-react";

export const Route = createFileRoute("/client")({
  component: () => (
    <DashboardShell
      requireRole="client"
      nav={
        <nav className="hidden items-center gap-1 rounded-full border border-primary/15 bg-card/40 p-1 text-sm backdrop-blur sm:flex">
          <Link
            to="/client"
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-muted-foreground transition hover:text-primary"
            activeOptions={{ exact: true }}
            activeProps={{ className: "bg-gradient-neon text-primary-foreground shadow-neon" }}
          >
            <LayoutDashboard size={13} /> Dashboard
          </Link>
          <Link
            to="/client/ai-settings"
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-muted-foreground transition hover:text-primary"
            activeProps={{ className: "bg-gradient-neon text-primary-foreground shadow-neon" }}
          >
            <Sparkles size={13} /> AI Settings
          </Link>
          <Link
            to="/client/channels"
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-muted-foreground transition hover:text-primary"
            activeProps={{ className: "bg-gradient-neon text-primary-foreground shadow-neon" }}
          >
            <MessagesSquare size={13} /> Channels
          </Link>
          <Link
            to="/client/devices"
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-muted-foreground transition hover:text-primary"
            activeProps={{ className: "bg-gradient-neon text-primary-foreground shadow-neon" }}
          >
            <Smartphone size={13} /> Devices
          </Link>
        </nav>
      }
    >
      <Outlet />
    </DashboardShell>
  ),
});
