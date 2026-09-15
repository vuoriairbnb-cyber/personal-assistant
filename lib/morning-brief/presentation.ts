export type MorningBriefHeaderMeta = { date: string; generatedAt: string };

const dateFormat = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Helsinki" });
const timeFormat = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Helsinki" });

/** Date is the persisted Helsinki brief date; the update label is its generation time, never page-render time. */
export function presentMorningBriefHeader(meta: MorningBriefHeaderMeta | null) {
  if (!meta) return { date: "No current brief", updated: null };
  return { date: dateFormat.format(new Date(`${meta.date}T12:00:00Z`)), updated: `Brief updated ${timeFormat.format(new Date(meta.generatedAt))}` };
}
