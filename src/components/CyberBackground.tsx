/**
 * Ambient layered background used across landing + dashboards.
 * Pure CSS — no JS, no runtime cost. Sticks behind everything via -z-10.
 */
export function CyberBackground({ variant = "default" }: { variant?: "default" | "dense" | "soft" }) {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Base gradient wash */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_-10%,oklch(0.22_0.05_280/0.5),transparent_70%)]" />
      {/* Cyber grid */}
      <div className={`absolute inset-0 cyber-grid ${variant === "dense" ? "opacity-90" : variant === "soft" ? "opacity-40" : "opacity-70"}`}
           style={{ maskImage: "radial-gradient(ellipse 90% 70% at 50% 30%, black 30%, transparent 80%)" }} />
      {/* Aurora */}
      <div className="absolute inset-0 aurora-drift opacity-70" />
      {/* Floating particles */}
      <div className="absolute inset-0">
        {Array.from({ length: 18 }).map((_, i) => {
          const top = (i * 37) % 100;
          const left = (i * 53) % 100;
          const delay = (i % 6) * 0.6;
          const size = 2 + (i % 4);
          const hue = i % 2 === 0 ? "var(--neon)" : "var(--neon-2)";
          return (
            <span
              key={i}
              className="particle absolute rounded-full"
              style={{
                top: `${top}%`,
                left: `${left}%`,
                width: size,
                height: size,
                background: hue,
                boxShadow: `0 0 ${6 + size * 2}px ${hue}`,
                animationDelay: `${delay}s`,
                opacity: 0.6,
              }}
            />
          );
        })}
      </div>
      {/* Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_120%,oklch(0.05_0.02_270/0.9),transparent_60%)]" />
    </div>
  );
}
