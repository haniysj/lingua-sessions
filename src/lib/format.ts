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
