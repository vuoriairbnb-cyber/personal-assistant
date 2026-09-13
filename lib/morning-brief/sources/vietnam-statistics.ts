import { createHash } from "node:crypto";
import { MORNING_BRIEF_FEEDS } from "./config";
import { fetchPublicSource } from "./http";
import type { MorningBriefSourceAdapter, SourceCandidate, SourceFetch } from "./types";

const decode = (value: string) => value.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/\s+/g, " ").trim();
const hash = (value: string) => createHash("sha256").update(value).digest("hex").slice(0, 48);
const macroTerms = /\b(gdp|gross domestic|cpi|consumer price|inflation|industrial production|retail sales?|fdi|foreign direct investment|trade|export|import|employment|socio-economic|economic performance|investment)\b/i;
const dateFromText = (value: string) => {
  const match = value.match(/(?:date of issue:\s*)?(\d{1,2})\/(\d{1,2})\/(\d{4})/i);
  const [, day, month, year] = match ?? [];
  return day && month && year ? new Date(`${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T12:00:00.000Z`).toISOString() : undefined;
};

/** Keeps only market-relevant macro releases from the official English NSO press room. */
export function parseVietnamStatisticsPressRoom(html: string, indexUrl: string, maxItems: number): SourceCandidate[] {
  const candidates: SourceCandidate[] = [];
  for (const match of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const title = decode(match[2] ?? ""); if (!title || title.length < 12 || !macroTerms.test(title)) continue;
    let canonicalUrl: string; try { canonicalUrl = new URL(match[1]!, indexUrl).toString(); } catch { continue; }
    if (!/nso\.gov\.vn/i.test(canonicalUrl) || candidates.some((item) => item.canonicalUrl === canonicalUrl)) continue;
    const nearby = decode(html.slice(Math.max(0, match.index! - 650), match.index! + match[0].length + 650)); const publishedAt = dateFromText(nearby); if (!publishedAt) continue;
    candidates.push({ sourceSlug: "vietnam-statistics", sourceArticleId: hash(canonicalUrl), title, canonicalUrl, excerpt: nearby, publishedAt, categories: ["official macro release"], language: "en", rawMetadata: { listing: "official-press-room", source_family: "official_primary_statistics", country: "Vietnam" } });
    if (candidates.length >= maxItems) break;
  }
  return candidates;
}

export const vietnamStatisticsSourceAdapter: MorningBriefSourceAdapter = {
  sourceSlug: "vietnam-statistics",
  async fetchCandidates(fetcher: SourceFetch = fetch) {
    const feed = MORNING_BRIEF_FEEDS.find((item) => item.id === "vietnam-statistics-press-room");
    if (!feed?.enabled) return [];
    const response = await fetchPublicSource(feed.url, { cache: "no-store", headers: { Accept: "text/html" } }, fetcher);
    if (!response.ok) throw new Error(`Vietnam Statistics press room unavailable (${response.status}).`);
    return parseVietnamStatisticsPressRoom(await response.text(), feed.url, feed.maxItems);
  },
};
