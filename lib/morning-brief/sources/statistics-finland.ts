import { MORNING_BRIEF_FEEDS } from "./config";
import { fetchPublicSource } from "./http";
import { parseOfficialNewsIndex } from "./official-index";
import type { MorningBriefSourceAdapter, SourceCandidate, SourceFetch } from "./types";

const macroTerms = /\b(cpi|consumer price|inflation|gdp|gross domestic product|employment|unemployment|industrial production|retail|bankruptc|construction|housing|property|trade|current account|public finance|manufactur|turnover)\b/i;
export const isRelevantStatisticsFinlandCandidate = (candidate: SourceCandidate) => macroTerms.test(`${candidate.title} ${candidate.excerpt}`);
export const statisticsFinlandSourceAdapter: MorningBriefSourceAdapter = {
  sourceSlug: "statistics-finland", shouldKeepCandidate: isRelevantStatisticsFinlandCandidate,
  async fetchCandidates(fetcher: SourceFetch = fetch) {
    const feed = MORNING_BRIEF_FEEDS.find((item) => item.id === "statistics-finland-releases"); if (!feed?.enabled) return [];
    const response = await fetchPublicSource(feed.url, { cache: "no-store", headers: { Accept: "text/html" } }, fetcher);
    if (!response.ok) throw new Error(`Statistics Finland index unavailable (${response.status}).`);
    return parseOfficialNewsIndex(await response.text(), { sourceSlug: "statistics-finland", indexUrl: feed.url, language: feed.language, maxItems: feed.maxItems, hosts: ["stat.fi"], metadata: { source_family: "official_primary_statistics", freshness_class: "official_macro_release", feed_id: feed.id } });
  },
};
