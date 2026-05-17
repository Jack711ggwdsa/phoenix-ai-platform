import { Bot } from "lucide-react";

/**
 * Phoenix AI mascot — a futuristic AI core with orbiting tech rings,
 * hologram aura, and floating particles. Pure CSS animation.
 */
export function AIMascot({ size = 380 }: { size?: number }) {
  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      {/* Hologram aura */}
      <div className="absolute inset-0 rounded-full opacity-70 blur-3xl"
           style={{ background: "radial-gradient(circle, var(--neon) 0%, transparent 60%)" }} />
      <div className="absolute inset-0 rounded-full opacity-50 blur-3xl"
           style={{ background: "radial-gradient(circle at 70% 30%, var(--neon-2) 0%, transparent 55%)" }} />

      {/* Orbiting tech rings */}
      <div className="absolute inset-0 animate-orbit-slow">
        <div className="absolute inset-0 rounded-full border border-primary/30" />
        <span className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 rounded-full bg-neon shadow-neon" />
      </div>
      <div className="absolute inset-6 animate-orbit-reverse">
        <div className="absolute inset-0 rounded-full border border-[oklch(0.72_0.22_305/0.4)]" />
        <span className="absolute right-0 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full"
              style={{ background: "var(--neon-2)", boxShadow: "0 0 12px var(--neon-2)" }} />
      </div>
      <div className="absolute inset-14 animate-orbit-fast">
        <div className="absolute inset-0 rounded-full border border-primary/25" />
        <span className="absolute left-0 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-emerald-300 shadow-[0_0_10px_oklch(0.85_0.18_165)]" />
      </div>

      {/* Pulse rings */}
      <div className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2">
        <span className="pulse-ring" />
        <span className="pulse-ring delay" />
      </div>

      {/* Core orb */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="relative h-36 w-36">
          {/* Outer hex hologram */}
          <svg viewBox="0 0 200 200" className="absolute inset-0 hologram-flicker">
            <defs>
              <linearGradient id="mascotGrad" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0%" stopColor="oklch(0.78 0.18 250)" />
                <stop offset="100%" stopColor="oklch(0.72 0.22 305)" />
              </linearGradient>
            </defs>
            <polygon points="100,10 180,55 180,145 100,190 20,145 20,55"
                     fill="none" stroke="url(#mascotGrad)" strokeWidth="1.5" opacity="0.7" />
            <polygon points="100,30 165,65 165,135 100,170 35,135 35,65"
                     fill="none" stroke="url(#mascotGrad)" strokeWidth="1" opacity="0.4" />
          </svg>
          {/* Inner core */}
          <div className="absolute inset-6 flex items-center justify-center rounded-full bg-gradient-neon shadow-neon animate-pulse-glow">
            <div className="absolute inset-2 rounded-full bg-[radial-gradient(circle_at_30%_30%,oklch(0.95_0.05_250/0.9),transparent_60%)]" />
            <Bot className="relative text-primary-foreground" size={44} strokeWidth={2.2} />
          </div>
          {/* Spinning halo */}
          <div className="absolute inset-0 animate-spin-y">
            <div className="absolute inset-0 rounded-full border border-white/10" />
          </div>
        </div>
      </div>

      {/* Floating particles around mascot */}
      {Array.from({ length: 14 }).map((_, i) => {
        const angle = (i / 14) * Math.PI * 2;
        const r = size * 0.42;
        const x = Math.cos(angle) * r + size / 2;
        const y = Math.sin(angle) * r + size / 2;
        return (
          <span
            key={i}
            className="particle absolute h-1.5 w-1.5 rounded-full"
            style={{
              left: x, top: y,
              background: i % 2 ? "var(--neon-2)" : "var(--neon)",
              boxShadow: `0 0 8px ${i % 2 ? "var(--neon-2)" : "var(--neon)"}`,
              animationDelay: `${(i % 6) * 0.5}s`,
            }}
          />
        );
      })}
    </div>
  );
}
