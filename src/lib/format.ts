export function formatOmr(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  return `${n.toFixed(3)} ر.ع.`;
}

export function waLink(phone: string | null | undefined, message: string): string | null {
  if (!phone) return null;
  const digits = phone.replace(/[^\d]/g, "");
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function weeksBetween(start?: string | null, end?: string | null): number {
  if (!start || !end) return 0;
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  if (!isFinite(s) || !isFinite(e) || e < s) return 0;
  return Math.max(1, Math.round((e - s) / (7 * 24 * 60 * 60 * 1000)));
}

export function totalHours(weeks: number, hoursPerWeek?: number | null): number {
  return weeks * Number(hoursPerWeek ?? 0);
}

export function formatDateAr(d?: string | null): string {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("ar-OM", { year: "numeric", month: "long", day: "numeric" });
  } catch { return d; }
}
