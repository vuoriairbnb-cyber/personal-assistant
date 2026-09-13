import { createHash } from "node:crypto";
import { MORNING_BRIEF_FEEDS } from "./config";
import { fetchPublicSource } from "./http";
import type { MorningBriefSourceAdapter, SourceCandidate, SourceFetch } from "./types";

const decode = (value: string) => value.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/\s+/g, " ").trim();
const hash = (value: string) => createHash("sha256").update(value).digest("hex").slice(0, 48);
const dateFromText = (value: string) => {
  const match = value.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  const [, day, month, year] = match ?? [];
  return day && month && year ? new Date(`${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T12:00:00.000Z`).toISOString() : undefined;
};

export function pynContentType(title: string): "monthly_review" | "investor_letter" | "market_commentary" | "fund_update" | "other" {
  if (/investor letter/i.test(title)) return "investor_letter";
  if (/monthly review|\bup\b|\bdown\b/i.test(title)) return "monthly_review";
  if (/market|vietnam|ind(?:eres|ex)/i.test(title)) return "market_commentary";
  if (/pyn elite|fund/i.test(title)) return "fund_update";
  return "other";
}

/** Parses only public article cards from PYN's own English news index. */
export function parsePynEliteNewsIndex(html: string, indexUrl: string, maxItems: number): SourceCandidate[] {
  const candidates: SourceCandidate[] = [];
  for (const match of html.matchAll(/<article\b[^>]*\belementor-post\b[^>]*>([\s\S]*?)<\/article>/gi)) {
    const article = match[1] ?? "";
    const titleLink = article.match(/<h[1-6][^>]*\belementor-post__title\b[^>]*>[\s\S]*?<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i);
    if (!titleLink) continue;
    const title = decode(titleLink[2] ?? "");
    if (!title || title.length < 8) continue;
    let canonicalUrl: string;
    try { canonicalUrl = new URL(titleLink[1]!, indexUrl).toString(); } catch { continue; }
    const pathname = new URL(canonicalUrl).pathname;
    if (!/^\/en\/(?:reviews|blog|investor-letters|news)\//i.test(pathname) || candidates.some((item) => item.canonicalUrl === canonicalUrl)) continue;
    const excerpt = decode(article.match(/<div[^>]*\belementor-post__excerpt\b[^>]*>([\s\S]*?)<\/div>/i)?.[1] ?? "");
    const publishedAt = dateFromText(article); if (!publishedAt) continue;
    const contentType = pynContentType(title);
    const freshnessClass = contentType === "monthly_review" || contentType === "investor_letter" || contentType === "market_commentary" || contentType === "fund_update" ? "portfolio_manager_update" : "standard_news";
    candidates.push({ sourceSlug: "pyn-elite", sourceArticleId: hash(canonicalUrl), title, canonicalUrl, excerpt, publishedAt, categories: [contentType], language: "en", rawMetadata: { listing: "official-public-news-index", source_family: "portfolio_manager_official", portfolio_lens: "PYN Elite", region: /vietnam/i.test(`${title} ${excerpt}`) ? "Vietnam" : null, pyn_content_type: contentType, freshness_class: freshnessClass } });
    if (candidates.length >= maxItems) break;
  }
  return candidates;
}

export const pynEliteSourceAdapter: MorningBriefSourceAdapter = {
  sourceSlug: "pyn-elite",
  async fetchCandidates(fetcher: SourceFetch = fetch) {
    const feed = MORNING_BRIEF_FEEDS.find((item) => item.id === "pyn-elite-news");
    if (!feed?.enabled) return [];
    const response = await fetchPublicSource(feed.url, { cache: "no-store", headers: { Accept: "text/html" } }, fetcher);
    if (!response.ok) throw new Error(`PYN Elite news index unavailable (${response.status}).`);
    return parsePynEliteNewsIndex(await response.text(), feed.url, feed.maxItems);
  },
};
