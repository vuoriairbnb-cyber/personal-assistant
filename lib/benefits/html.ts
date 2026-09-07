/** Converts remote catalog HTML to safe index/display text; it is never rendered as HTML. */
export function htmlToPlainText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'")
    .replace(/&auml;/gi, "ä").replace(/&ouml;/gi, "ö").replace(/&Aring;/gi, "Å").replace(/&aring;/gi, "å")
    .replace(/&#(\d+);/g, (_match, code) => String.fromCodePoint(Number(code)))
    .replace(/\s+/g, " ").trim();
}
