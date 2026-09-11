import { createHash } from "node:crypto";
import { MORNING_BRIEF_FEEDS } from "./config";
import { fetchPublicSource } from "./http";
import type { MorningBriefSourceAdapter, SourceCandidate, SourceFetch } from "./types";

const decode = (value: string) => value.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const hash = (value: string) => createHash("sha256").update(value).digest("hex").slice(0, 48);
const dateFromText = (value: string) => {
  const match = value.match(/(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})/i);
  return match ? new Date(`${match[2]} ${match[1]}, ${match[3]} 12:00:00 UTC`).toISOString() : undefined;
};

/** The publisher's redesign currently exposes this official listing but not a stable news RSS URL. */
export function parseBankOfFinlandNewsIndex(html: string, feedUrl: string, maxItems: number): SourceCandidate[] {
  const matches = [...html.matchAll(/<(?:a|h2|h3)[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/(?:a|h2|h3)>/gi)];
  const candidates: SourceCandidate[] = [];
  for (const match of matches) {
    const title = decode(match[2] ?? ""); if (!title || title.length < 12 || /^(more|all news|news|releases)$/i.test(title)) continue;
    let canonicalUrl: string; try { canonicalUrl = new URL(match[1]!, feedUrl).toString(); } catch { continue; }
    if (!canonicalUrl.includes("suomenpankki.fi") || candidates.some((item) => item.canonicalUrl === canonicalUrl)) continue;
    const nearby = decode(html.slice(Math.max(0, match.index! - 500), match.index! + match[0].length + 300)); const publishedAt = dateFromText(nearby); if (!publishedAt) continue;
    candidates.push({ sourceSlug: "bank-of-finland", sourceArticleId: hash(canonicalUrl), title, canonicalUrl, excerpt: "", publishedAt, categories: [/press release/i.test(nearby) ? "press release" : "news"], language: "en", rawMetadata: { feed_url: feedUrl, listing: "official-news-index" } });
    if (candidates.length >= maxItems) break;
  }
  return candidates;
}

export const bankOfFinlandSourceAdapter: MorningBriefSourceAdapter = { sourceSlug: "bank-of-finland", async fetchCandidates(fetcher: SourceFetch = fetch) { const feed = MORNING_BRIEF_FEEDS.find((item) => item.id === "bank-of-finland-news"); if (!feed?.enabled) return []; const response = await fetchPublicSource(feed.url, { cache: "no-store", headers: { Accept: "text/html" } }, fetcher); if (!response.ok) throw new Error(`Bank of Finland news index unavailable (${response.status}).`); return parseBankOfFinlandNewsIndex(await response.text(), feed.url, feed.maxItems); } };
