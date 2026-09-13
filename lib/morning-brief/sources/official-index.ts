import { createHash } from "node:crypto";
import type { SourceCandidate } from "./types";

const decode = (value: string) => value
  .replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"')
  .replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
  .replace(/\s+/g, " ").trim();
const hash = (value: string) => createHash("sha256").update(value).digest("hex").slice(0, 48);

function dateFromText(value: string, dateOrder: "dmy" | "mdy") {
  const patterns: Array<{ at: number; value: string }> = [];
  for (const match of value.matchAll(/\b(20\d{2})-(\d{2})-(\d{2})\b/g)) patterns.push({ at: match.index ?? 0, value: `${match[1]}-${match[2]}-${match[3]}T12:00:00.000Z` });
  for (const match of value.matchAll(/\b(\d{1,2})[./](\d{1,2})[./](20\d{2})\b/g)) {
    const first = match[1] ?? ""; const second = match[2] ?? ""; const year = match[3] ?? "";
    const day = dateOrder === "dmy" ? first : second; const month = dateOrder === "dmy" ? second : first;
    const timestamp = Date.parse(`${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T12:00:00.000Z`);
    if (Number.isFinite(timestamp)) patterns.push({ at: match.index ?? 0, value: new Date(timestamp).toISOString() });
  }
  for (const match of value.matchAll(/\b(\d{1,2})\s+(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s*,?\s*(20\d{2})\b/gi)) patterns.push({ at: match.index ?? 0, value: new Date(`${match[2]} ${match[1]}, ${match[3]} 12:00:00 UTC`).toISOString() });
  for (const match of value.matchAll(/\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+(\d{1,2}),?\s*(20\d{2})\b/gi)) patterns.push({ at: match.index ?? 0, value: new Date(`${match[1]} ${match[2]}, ${match[3]} 12:00:00 UTC`).toISOString() });
  return patterns.sort((left, right) => left.at - right.at)[0]?.value;
}

/** Conservative parser for verified public HTML indexes: it accepts only dated links on the source host. */
export function parseOfficialNewsIndex(html: string, options: { sourceSlug: string; indexUrl: string; language: string; maxItems: number; hosts: readonly string[]; dateOrder?: "dmy" | "mdy"; metadata?: Record<string, unknown> }): SourceCandidate[] {
  const candidates: SourceCandidate[] = [];
  for (const match of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const title = decode(match[2] ?? "");
    if (!title || title.length < 12 || /^(read more|learn more|more|news|current issues|all news|home)$/i.test(title)) continue;
    let canonicalUrl: string;
    try { canonicalUrl = new URL(match[1]!, options.indexUrl).toString(); } catch { continue; }
    if (!options.hosts.includes(new URL(canonicalUrl).hostname) || candidates.some((candidate) => candidate.canonicalUrl === canonicalUrl)) continue;
    const nearby = decode(html.slice(Math.max(0, match.index! - 550), match.index! + match[0].length + 550));
    const publishedAt = dateFromText(nearby, options.dateOrder ?? "dmy");
    if (!publishedAt) continue;
    candidates.push({ sourceSlug: options.sourceSlug, sourceArticleId: hash(canonicalUrl), title, canonicalUrl, excerpt: "", publishedAt, categories: ["official news"], language: options.language, rawMetadata: { listing: "official-public-index", index_url: options.indexUrl, ...(options.metadata ?? {}) } });
    if (candidates.length >= options.maxItems) break;
  }
  return candidates;
}
