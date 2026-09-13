import { MORNING_BRIEF_FEEDS } from "./config";
import { fetchPublicSource } from "./http";
import { parseOfficialNewsIndex } from "./official-index";
import type { MorningBriefSourceAdapter, SourceCandidate, SourceFetch } from "./types";

const relevant = /\b(economic forecast|economic outlook|growth|inflation|fiscal|debt|deficit|economic governance|european semester|competitiveness|investment|resilience|macro(?:economic)?|euro area|banking union)\b/i;
const majorResearch = /\b(economic forecast|economic outlook)\b/i;
export const isRelevantDgEcfinCandidate = (candidate: SourceCandidate) => relevant.test(`${candidate.title} ${candidate.excerpt}`);
export const dgEcfinSourceAdapter: MorningBriefSourceAdapter = {
  sourceSlug: "dg-ecfin", shouldKeepCandidate: isRelevantDgEcfinCandidate,
  async fetchCandidates(fetcher: SourceFetch = fetch) {
    const feed = MORNING_BRIEF_FEEDS.find((item) => item.id === "dg-ecfin-newsletter"); if (!feed?.enabled) return [];
    const response = await fetchPublicSource(feed.url, { cache: "no-store", headers: { Accept: "text/html" } }, fetcher);
    if (!response.ok) throw new Error(`DG ECFIN newsletter index unavailable (${response.status}).`);
    return parseOfficialNewsIndex(await response.text(), { sourceSlug: "dg-ecfin", indexUrl: feed.url, language: feed.language, maxItems: feed.maxItems, hosts: ["economy-finance.ec.europa.eu", "ec.europa.eu"], metadata: { source_family: "official_economic_policy", region: "Europe", feed_id: feed.id } })
      .map((candidate) => ({ ...candidate, contentType: majorResearch.test(candidate.title) ? "long_read" as const : undefined, rawMetadata: { ...candidate.rawMetadata, freshness_class: majorResearch.test(candidate.title) ? "long_form_research" : "standard_news" } }));
  },
};
