/** Removes accidental list markers from generated or legacy takeaway text. */
export function normalizeStoryTakeaway(value: string) {
  return value.trim().replace(/^\s*(?:\d+[.)]\s*|[•*-]\s+|\d+(?=[A-Z]))/, "").trim();
}
