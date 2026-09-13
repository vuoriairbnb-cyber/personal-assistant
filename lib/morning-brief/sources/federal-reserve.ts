import { MORNING_BRIEF_FEEDS } from "./config";
import { fetchPublicSource } from "./http";
import { rssCandidates } from "./rss";
import type { MorningBriefSourceAdapter, SourceCandidate, SourceFetch } from "./types";

const policyTerms = /\b(monetary policy|interest rates?|fomc|federal funds|economic projections?|financial stability|credit|liquidity|banking|inflation|employment)\b/i;

/** Keeps the monetary-policy feed whole while excluding routine speeches from the broader speeches feed. */
export function isRelevantFederalReserveCandidate(candidate: SourceCandidate, feedId: string) {
  return feedId === "federal-reserve-monetary" || policyTerms.test(`${candidate.title} ${candidate.excerpt} ${candidate.categories.join(" ")}`);
}

export const federalReserveSourceAdapter: MorningBriefSourceAdapter = {
  sourceSlug: "federal-reserve",
  shouldKeepCandidate: (candidate) => isRelevantFederalReserveCandidate(candidate, typeof candidate.rawMetadata.feed_id === "string" ? candidate.rawMetadata.feed_id : ""),
  async fetchCandidates(fetcher: SourceFetch = fetch) {
    const feeds = MORNING_BRIEF_FEEDS.filter((feed) => feed.sourceSlug === "federal-reserve" && feed.enabled);
    const groups = await Promise.all(feeds.map(async (feed) => {
      const response = await fetchPublicSource(feed.url, { cache: "no-store", headers: { Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml" } }, fetcher);
      if (!response.ok) throw new Error(`Federal Reserve feed unavailable (${response.status}).`);
      return rssCandidates(await response.text(), { sourceSlug: "federal-reserve", language: feed.language, feedUrl: feed.url, maxItems: feed.maxItems })
        .map((candidate) => ({ ...candidate, rawMetadata: { ...candidate.rawMetadata, source_family: "official_primary_policy", feed_id: feed.id } }));
    }));
    const seen = new Set<string>();
    return groups.flat().filter((candidate) => !seen.has(candidate.canonicalUrl) && Boolean(seen.add(candidate.canonicalUrl)));
  },
};
