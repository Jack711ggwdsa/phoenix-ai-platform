import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAuth, type Role } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { PhoenixLogo } from "@/components/PhoenixLogo";
import { CyberBackground } from "@/components/CyberBackground";
import { AIMascot } from "@/components/AIMascot";
import {
  Loader2, ArrowLeft, Brain, Workflow, Mic, Network,
  MessageSquare, BarChart3, Sparkles, Zap,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({ meta: [{ title: "Sign in — Phoenix AI Platform" }] }),
});

const ADMIN_EMAIL = "phoenixlegend818@gmail.com";

const FLOATING_ICONS = [
  { Icon: Brain,         top: "8%",  left: "6%",  delay: 0   },
  { Icon: Workflow,      top: "18%", left: "88%", delay: 0.6 },
  { Icon: Mic,           top: "70%", left: "4%",  delay: 1.2 },
  { Icon: Network,       top: "82%", left: "92%", delay: 1.8 },
  { Icon: MessageSquare, top: "38%", left: "92%", delay: 0.3 },
  { Icon: BarChart3,     top: "55%", left: "6%",  delay: 0.9 },
  { Icon: Sparkles,      top: "12%", left: "48%", delay: 1.5 },
  { Icon: Zap,           top: "88%", left: "46%", delay: 2.1 },
];

function LoginPage() {
  const { profile, session, loading, profileLoading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resolvedRole, setResolvedRole] = useState<Role | null>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);

  const goTo = (role: Role) => {
    navigate({ to: role === "admin" ? "/admin" : "/client/channels", replace: true });
  };

  useEffect(() => {
    if (!loading && !profileLoading && session && profile && !resolvedRole) goTo(profile.role);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, profileLoading, session, profile]);

  // Mouse-reactive lighting
  useEffect(() => {
    const el = surfaceRef.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * 100;
      const y = ((e.clientY - r.top) / r.height) * 100;
      el.style.setProperty("--mx", `${x}%`);
      el.style.setProperty("--my", `${y}%`);
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  const ensureProfile = async (userId: string, userEmail: string): Promise<Role> => {
    const isAdminEmail = userEmail.toLowerCase() === ADMIN_EMAIL;
    const { data: existing } = await supabase
      .from("profiles").select("id,email,role,client_id").eq("id", userId).maybeSingle();
    if (!existing) {
      if (isAdminEmail) {
        await supabase.from("profiles").insert({ id: userId, email: userEmail, role: "admin" });
        await supabase.from("user_roles").upsert({ user_id: userId, role: "admin" });
        return "admin";
      }
      throw new Error("Your account is not yet activated. Please contact Phoenix Advertisement & Design.");
    }
    if (isAdminEmail && existing.role !== "admin") {
      await supabase.from("profiles").update({ role: "admin" }).eq("id", userId);
      await supabase.from("user_roles").upsert({ user_id: userId, role: "admin" });
      return "admin";
    }
    return existing.role as Role;
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { data, error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
      if (signInErr) {
        if (/invalid/i.test(signInErr.message)) {
          throw new Error("Invalid email or password. If you don't have an account, please contact Phoenix Advertisement & Design to activate it.");
        }
        throw new Error(signInErr.message);
      }
      const user = data.user;
      if (!user) throw new Error("Sign in succeeded but no session was returned.");
      const role = await ensureProfile(user.id, user.email ?? email);
      setResolvedRole(role);
      await refreshProfile();
      toast.success("Welcome back");
      goTo(role);
    } catch (e2) {
      const msg = e2 instanceof Error ? e2.message : "Unknown error";
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div ref={surfaceRef} className="relative min-h-screen overflow-hidden">
      <CyberBackground variant="dense" />

      {/* Mouse-reactive light */}
      <div
        className="pointer-events-none absolute inset-0 -z-[5] opacity-60 transition-opacity"
        style={{
          background:
            "radial-gradient(600px circle at var(--mx,50%) var(--my,40%), oklch(0.78 0.18 250 / 0.18), transparent 60%)",
        }}
      />

      {/* Animated neural network SVG overlay */}
      <svg
        className="pointer-events-none absolute inset-0 -z-[4] h-full w-full opacity-40"
        viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="netLine" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.78 0.18 250)" stopOpacity="0.7" />
            <stop offset="100%" stopColor="oklch(0.72 0.22 305)" stopOpacity="0.2" />
          </linearGradient>
        </defs>
        {[
          [120, 140, 480, 320], [480, 320, 820, 180], [820, 180, 1080, 340],
          [120, 140, 320, 600], [320, 600, 720, 660], [720, 660, 1080, 540],
          [480, 320, 720, 660], [820, 180, 720, 660], [320, 600, 480, 320],
        ].map(([x1, y1, x2, y2], i) => (
          <line
            key={i} x1={x1} y1={y1} x2={x2} y2={y2}
            stroke="url(#netLine)" strokeWidth="1"
            strokeDasharray="4 6"
            style={{ animation: `data-stream 4s linear ${i * 0.3}s infinite` }}
          />
        ))}
        {[[120,140],[480,320],[820,180],[1080,340],[320,600],[720,660],[1080,540]].map(([cx,cy],i)=>(
          <circle key={`n${i}`} cx={cx} cy={cy} r="3"
            fill="oklch(0.78 0.18 250)"
            style={{ animation: `pulse-glow 2.4s ease-in-out ${i*0.25}s infinite` }} />
        ))}
      </svg>

      {/* Scan line */}
      <div className="pointer-events-none absolute inset-0 -z-[3] scan-lines opacity-30" />

      {/* Floating AI icons */}
      {FLOATING_ICONS.map(({ Icon, top, left, delay }, i) => (
        <div
          key={i}
          className="pointer-events-none absolute hidden md:block"
          style={{
            top, left,
            animation: `particle-float 7s ease-in-out ${delay}s infinite`,
          }}
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-primary/30 bg-background/40 backdrop-blur-md shadow-neon">
            <Icon size={18} className="text-primary hologram-flicker" />
          </div>
        </div>
      ))}

      {/* Back to home */}
      <Link
        to="/"
        className="absolute left-4 top-4 z-20 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-background/40 px-4 py-2 text-xs font-medium text-foreground/90 backdrop-blur-xl transition hover:border-primary hover:text-primary hover:shadow-neon"
      >
        <ArrowLeft size={14} /> Back to Home
      </Link>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4 py-16">
        <div className="grid w-full items-center gap-10 lg:grid-cols-[1.05fr_1fr]">
          {/* Phoenix AI mascot */}
          <div className="relative hidden lg:block">
            <div className="relative" style={{ animation: "particle-float 6s ease-in-out infinite" }}>
              <AIMascot size={420} />
            </div>
            <div className="mt-8 max-w-md">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-primary">
                <span className="live-dot" /> Phoenix AI Online
              </div>
              <h2 className="mt-4 font-display text-3xl leading-tight text-gradient-ai">
                Your AI auto-closing employee, always on duty.
              </h2>
              <p className="mt-3 text-sm text-muted-foreground">
                Phoenix AI handles every customer reply across WhatsApp, Instagram, Messenger
                and voice — converting conversations into bookings 24/7.
              </p>
            </div>
          </div>

          {/* Login card */}
          <div className="relative mx-auto w-full max-w-md">
            {/* Outer neon halo */}
            <div className="absolute -inset-px rounded-3xl bg-gradient-neon opacity-40 blur-xl" />

            <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-background/50 p-8 backdrop-blur-2xl shadow-neon">
              {/* Animated scan line across the card */}
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent"
                   style={{ animation: "shimmer-line 3s linear infinite" }} />
              <div className="pointer-events-none absolute inset-0 cyber-grid opacity-20" />

              <div className="relative flex items-center justify-between">
                <PhoenixLogo size={28} />
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-2.5 py-0.5 text-[10px] uppercase tracking-widest text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_8px_oklch(0.85_0.18_165)] animate-pulse" />
                  Phoenix AI Online
                </span>
              </div>

              <h1 className="relative mt-6 font-display text-3xl text-gradient-ai">Welcome back</h1>
              <p className="relative mt-1 text-sm text-muted-foreground">
                Sign in to your Phoenix AI command center.
              </p>

              {error && (
                <div className="relative mt-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {error}
                </div>
              )}

              <form onSubmit={handleSignIn} className="relative mt-6 space-y-4">
                <div className="group">
                  <label className="text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">Email</label>
                  <input
                    type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-primary/20 bg-background/60 px-3.5 py-2.5 text-sm outline-none transition focus:border-primary focus:shadow-neon focus:bg-background/80"
                    placeholder="you@business.com"
                  />
                </div>
                <div className="group">
                  <label className="text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">Password</label>
                  <input
                    type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-primary/20 bg-background/60 px-3.5 py-2.5 text-sm outline-none transition focus:border-primary focus:shadow-neon focus:bg-background/80"
                    placeholder="••••••••"
                  />
                </div>

                <button
                  type="submit" disabled={submitting}
                  className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-lg bg-gradient-gold py-3 text-sm font-semibold text-primary-foreground shadow-gold transition hover:scale-[1.01] disabled:opacity-50"
                >
                  <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                  {submitting ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  {submitting ? "Authenticating…" : "Enter Phoenix AI"}
                </button>
              </form>

              {resolvedRole && (
                <button
                  type="button"
                  onClick={() => goTo(resolvedRole)}
                  className="relative mt-4 w-full rounded-lg border border-gold bg-gold/10 py-2 text-sm font-semibold text-gold transition hover:bg-gold/20 hover:shadow-gold"
                >
                  {resolvedRole === "admin" ? "Go to Admin Dashboard" : "Go to Client Dashboard"}
                </button>
              )}

              <div className="relative mt-6 border-t border-primary/10 pt-4 text-center text-xs text-muted-foreground">
                Don't have an account? Contact{" "}
                <span className="text-gradient-gold font-semibold">Phoenix Advertisement &amp; Design</span> to activate it.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
