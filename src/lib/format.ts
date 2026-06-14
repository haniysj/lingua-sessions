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

const AR_MONTHS = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

/** Display format: "05 يوليو 2026" with LTR isolation so day/year stay in order inside RTL text. */
export function formatDateAr(d?: string | null): string {
  if (!d) return "—";
  const date = new Date(d);
  if (isNaN(date.getTime())) return d;
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = AR_MONTHS[date.getMonth()];
  const yyyy = date.getFullYear();
  // \u2068 FSI ... \u2069 PDI keeps the sequence stable in RTL contexts
  return `\u2068${dd} ${mm} ${yyyy}\u2069`;
}

/** Edit/input format: "dd/mm/yyyy" */
export function formatDateDMY(d?: string | null): string {
  if (!d) return "";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "";
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/** Parse "dd/mm/yyyy" → "yyyy-mm-dd" (ISO date). Returns "" if invalid/incomplete. */
export function parseDMYtoISO(s: string): string {
  const m = s.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return "";
  const dd = m[1].padStart(2, "0");
  const mm = m[2].padStart(2, "0");
  const yyyy = m[3];
  const d = new Date(`${yyyy}-${mm}-${dd}`);
  if (isNaN(d.getTime())) return "";
  return `${yyyy}-${mm}-${dd}`;
}
