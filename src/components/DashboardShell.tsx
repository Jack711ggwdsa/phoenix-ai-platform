import { Link, useNavigate } from "@tanstack/react-router";
import { type ReactNode, useEffect } from "react";
import { useAuth, type Role } from "@/lib/auth";
import { PhoenixLogo } from "@/components/PhoenixLogo";
import { CyberBackground } from "@/components/CyberBackground";
import { LogOut, Loader2, Activity } from "lucide-react";

export function DashboardShell({
  requireRole,
  children,
  nav,
}: {
  requireRole: Role;
  children: ReactNode;
  nav?: ReactNode;
}) {
  const { loading, profileLoading, session, profile, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!session) navigate({ to: "/login" });
    else if (profileLoading) return;
    else if (!profile) {
      navigate({ to: "/login" });
    }
    else if (profile && profile.role !== requireRole) {
      navigate({ to: profile.role === "admin" ? "/admin" : "/client" });
    }
  }, [loading, profileLoading, session, profile, requireRole, navigate]);

  if (loading || (session && profileLoading)) {
    return (
      <div className="relative flex min-h-screen items-center justify-center">
        <CyberBackground variant="soft" />
        <Loader2 className="animate-spin text-primary" />
      </div>
    );
  }

  if (!session || !profile || profile.role !== requireRole) {
    return null;
  }

  const isAdmin = requireRole === "admin";

  return (
    <div className="relative min-h-screen">
      <CyberBackground variant={isAdmin ? "dense" : "default"} />

      <header className="sticky top-0 z-20 border-b border-primary/10 bg-background/40 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <Link to={isAdmin ? "/admin" : "/client"} className="flex items-center gap-3">
            <PhoenixLogo />
            <span className="hidden items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[10px] uppercase tracking-[0.2em] text-primary md:inline-flex">
              <Activity size={10} className="animate-pulse" />
              {isAdmin ? "Command Center" : "Control Center"}
            </span>
          </Link>
          <div className="flex items-center gap-3">
            {nav}
            <span className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:inline-flex">
              <span className="live-dot" /> {profile.email}
            </span>
            <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] uppercase tracking-widest text-primary">
              {profile.role}
            </span>
            <button
              onClick={async () => { await signOut(); navigate({ to: "/login" }); }}
              className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs transition hover:border-primary hover:text-primary hover:shadow-neon"
            >
              <LogOut size={14} /> Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-7xl px-4 py-8">{children}</main>
    </div>
  );
}
