import { createFileRoute, Outlet, Link } from "@tanstack/react-router";
import { DashboardShell } from "@/components/DashboardShell";
import { Users, MessagesSquare, Inbox } from "lucide-react";

export const Route = createFileRoute("/admin")({
  component: () => (
    <DashboardShell
      requireRole="admin"
      nav={
        <nav className="hidden items-center gap-1 rounded-full border border-primary/15 bg-card/40 p-1 text-sm backdrop-blur sm:flex">
          <Link
            to="/admin"
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-muted-foreground transition hover:text-primary"
            activeOptions={{ exact: true }}
            activeProps={{ className: "bg-gradient-neon text-primary-foreground shadow-neon" }}
          >
            <Users size={13} /> Clients
          </Link>
          <Link
            to="/admin/chat-logs"
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-muted-foreground transition hover:text-primary"
            activeProps={{ className: "bg-gradient-neon text-primary-foreground shadow-neon" }}
          >
            <MessagesSquare size={13} /> Chat logs
          </Link>
          <Link
            to="/admin/activity"
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-muted-foreground transition hover:text-primary"
            activeProps={{ className: "bg-gradient-neon text-primary-foreground shadow-neon" }}
          >
            <Inbox size={13} /> Submissions
          </Link>
        </nav>
      }
    >
      <Outlet />
    </DashboardShell>
  ),
});
