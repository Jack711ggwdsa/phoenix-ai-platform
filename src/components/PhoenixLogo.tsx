import { Flame } from "lucide-react";

export function PhoenixLogo({ size = 28 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="relative flex items-center justify-center rounded-md bg-gradient-neon shadow-neon"
        style={{ width: size + 8, height: size + 8 }}
      >
        <Flame size={size - 4} className="text-primary-foreground" strokeWidth={2.5} />
      </div>
      <div className="leading-tight">
        <div className="font-display text-base font-semibold text-gradient-neon">Phoenix AI</div>
        <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Platform</div>
      </div>
    </div>
  );
}
