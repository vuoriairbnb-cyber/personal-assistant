import { MORNING_BRIEF_FEEDS } from "./config";
import { fetchPublicSource } from "./http";
import { rssCandidates } from "./rss";
import type { MorningBriefSourceAdapter, SourceCandidate, SourceFetch } from "./types";

const macroTerms = /\b(inflation|consumer prices?|gdp|gross domestic product|employment|unemployment|industrial production|retail trade|international trade|government (debt|deficit|finance)|euro area|eurozone|producer prices?)\b/i;

/** Eurostat's official economy feed can still contain non-investment data releases. */
export function isRelevantEurostatCandidate(candidate: SourceCandidate) {
  return macroTerms.test(`${candidate.title} ${candidate.excerpt} ${candidate.categories.join(" ")}`);
}

export const eurostatSourceAdapter: MorningBriefSourceAdapter = {
  sourceSlug: "eurostat",
  shouldKeepCandidate: isRelevantEurostatCandidate,
  async fetchCandidates(fetcher: SourceFetch = fetch) {
    const feeds = MORNING_BRIEF_FEEDS.filter((feed) => feed.sourceSlug === "eurostat" && feed.enabled);
    const groups = await Promise.all(feeds.map(async (feed) => {
      const response = await fetchPublicSource(feed.url, { cache: "no-store", headers: { Accept: "application/atom+xml, application/rss+xml, application/xml, text/xml" } }, fetcher);
      if (!response.ok) throw new Error(`Eurostat feed unavailable (${response.status}).`);
      return rssCandidates(await response.text(), { sourceSlug: "eurostat", language: feed.language, feedUrl: feed.url, maxItems: feed.maxItems })
        .map((candidate) => ({ ...candidate, rawMetadata: { ...candidate.rawMetadata, source_family: "official_primary_statistics", feed_id: feed.id } }));
    }));
    const seen = new Set<string>();
    return groups.flat().filter((candidate) => !seen.has(candidate.canonicalUrl) && Boolean(seen.add(candidate.canonicalUrl)));
  },
};
