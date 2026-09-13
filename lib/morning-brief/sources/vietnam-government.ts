import { MORNING_BRIEF_FEEDS } from "./config";
import { fetchPublicSource } from "./http";
import { parseOfficialNewsIndex } from "./official-index";
import type { MorningBriefSourceAdapter, SourceCandidate, SourceFetch } from "./types";

const policyTerms = /\b(economic|economy|growth|investment|infrastructure|fdi|foreign direct|industrial|trade|export|banking|credit|property|real estate|currency|exchange rate|reform|public investment|fiscal)\b/i;
export const isRelevantVietnamGovernmentCandidate = (candidate: SourceCandidate) => policyTerms.test(`${candidate.title} ${candidate.excerpt}`);
export const vietnamGovernmentSourceAdapter: MorningBriefSourceAdapter = {
  sourceSlug: "vietnam-government", shouldKeepCandidate: isRelevantVietnamGovernmentCandidate,
  async fetchCandidates(fetcher: SourceFetch = fetch) {
    const feed = MORNING_BRIEF_FEEDS.find((item) => item.id === "vietnam-government-news"); if (!feed?.enabled) return [];
    const response = await fetchPublicSource(feed.url, { cache: "no-store", headers: { Accept: "text/html" } }, fetcher);
    if (!response.ok) throw new Error(`Vietnam Government Portal index unavailable (${response.status}).`);
    return parseOfficialNewsIndex(await response.text(), { sourceSlug: "vietnam-government", indexUrl: feed.url, language: feed.language, maxItems: feed.maxItems, hosts: ["en.baochinhphu.vn"], dateOrder: "mdy", metadata: { source_family: "official_economic_policy", country: "Vietnam", feed_id: feed.id } });
  },
};
