import { MORNING_BRIEF_FEEDS } from "./config";
import { fetchPublicSource } from "./http";
import { parseOfficialNewsIndex } from "./official-index";
import type { MorningBriefSourceAdapter, SourceCandidate, SourceFetch } from "./types";

const policyTerms = /\b(economy|economic|employment|labour|labor|investment|industrial|energy|business|permit|regulation|reform|growth|competitiveness)\b/i;
export const isRelevantEconomicAffairsFinlandCandidate = (candidate: SourceCandidate) => policyTerms.test(`${candidate.title} ${candidate.excerpt}`);
export const economicAffairsFinlandSourceAdapter: MorningBriefSourceAdapter = {
  sourceSlug: "economic-affairs-finland", shouldKeepCandidate: isRelevantEconomicAffairsFinlandCandidate,
  async fetchCandidates(fetcher: SourceFetch = fetch) {
    const feed = MORNING_BRIEF_FEEDS.find((item) => item.id === "economic-affairs-finland-current-issues"); if (!feed?.enabled) return [];
    const response = await fetchPublicSource(feed.url, { cache: "no-store", headers: { Accept: "text/html" } }, fetcher);
    if (!response.ok) throw new Error(`Finnish Ministry of Economic Affairs and Employment index unavailable (${response.status}).`);
    return parseOfficialNewsIndex(await response.text(), { sourceSlug: "economic-affairs-finland", indexUrl: feed.url, language: feed.language, maxItems: feed.maxItems, hosts: ["tem.fi"], metadata: { source_family: "official_economic_policy", country: "Finland", feed_id: feed.id } });
  },
};
