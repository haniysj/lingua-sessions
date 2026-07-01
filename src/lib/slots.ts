// Helpers for parsing "coming soon" schedule slots.
// Convention: a slot string ending with the marker `(قريباً)` is treated as
// coming soon. The clean label is the same string with the marker removed.
export const SOON_MARKER = "(قريباً)";

export type ParsedSlot = { raw: string; label: string; comingSoon: boolean };

export function parseSlot(raw: string): ParsedSlot {
  const trimmed = raw.trim();
  if (trimmed.endsWith(SOON_MARKER)) {
    return { raw, label: trimmed.slice(0, -SOON_MARKER.length).trim(), comingSoon: true };
  }
  return { raw, label: trimmed, comingSoon: false };
}

export function buildSlot(label: string, comingSoon: boolean): string {
  const clean = label.trim();
  if (!clean) return "";
  return comingSoon ? `${clean} ${SOON_MARKER}` : clean;
}
