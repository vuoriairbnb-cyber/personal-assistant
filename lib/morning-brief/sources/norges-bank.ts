import { MORNING_BRIEF_FEEDS } from "./config";
import { fetchPublicSource } from "./http";
import { rssCandidates } from "./rss";
import type { MorningBriefSourceAdapter, SourceCandidate, SourceFetch } from "./types";

const relevant = /\b(monetary policy|policy rate|financial stability|credit|lending|bank|property|housing|corporate financ|oil|energy|krone|liquidity|funding)\b/i;
export const isRelevantNorgesBankCandidate = (candidate: SourceCandidate) => relevant.test(`${candidate.title} ${candidate.excerpt} ${candidate.categories.join(" ")}`);
export const norgesBankSourceAdapter: MorningBriefSourceAdapter = {
  sourceSlug: "norges-bank", shouldKeepCandidate: isRelevantNorgesBankCandidate,
  async fetchCandidates(fetcher: SourceFetch = fetch) {
    const feeds = MORNING_BRIEF_FEEDS.filter((feed) => feed.sourceSlug === "norges-bank" && feed.enabled);
    const groups = await Promise.all(feeds.map(async (feed) => { const response = await fetchPublicSource(feed.url, { cache: "no-store", headers: { Accept: "application/rss+xml, application/xml, text/xml" } }, fetcher); if (!response.ok) throw new Error(`Norges Bank feed unavailable (${response.status}).`); return rssCandidates(await response.text(), { sourceSlug: "norges-bank", language: feed.language, feedUrl: feed.url, maxItems: feed.maxItems }).map((candidate) => ({ ...candidate, rawMetadata: { ...candidate.rawMetadata, source_family: "official_primary_policy", freshness_class: "official_macro_release", feed_id: feed.id } })); }));
    const seen = new Set<string>(); return groups.flat().filter((candidate) => !seen.has(candidate.canonicalUrl) && Boolean(seen.add(candidate.canonicalUrl)));
  },
};
