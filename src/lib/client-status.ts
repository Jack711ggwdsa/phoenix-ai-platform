export type LiveStatus = "active" | "expired" | "paused";

export function liveStatus(c: { status?: string | null; expiry_date?: string | null }): LiveStatus {
  if (c.status === "paused") return "paused";
  if (c.expiry_date && new Date(c.expiry_date) < new Date(new Date().toDateString())) return "expired";
  if (c.status === "expired") return "expired";
  return "active";
}

export function daysRemaining(expiry_date?: string | null): number | null {
  if (!expiry_date) return null;
  const today = new Date(new Date().toDateString()).getTime();
  const exp = new Date(expiry_date).getTime();
  return Math.ceil((exp - today) / 86400000);
}

export function daysRemainingLabel(expiry_date?: string | null): string {
  const d = daysRemaining(expiry_date);
  if (d === null) return "—";
  if (d < 0) return "Expired";
  if (d === 0) return "Expires today";
  if (d === 1) return "1 day remaining";
  return `${d} days remaining`;
}

export function isClientActive(c: { status?: string | null; expiry_date?: string | null }): boolean {
  return liveStatus(c) === "active";
}
