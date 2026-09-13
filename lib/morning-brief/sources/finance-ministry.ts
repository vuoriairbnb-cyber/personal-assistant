import { MORNING_BRIEF_FEEDS } from "./config";
import { fetchPublicSource } from "./http";
import { parseOfficialNewsIndex } from "./official-index";
import type { MorningBriefSourceAdapter, SourceCandidate, SourceFetch } from "./types";

const fiscalTerms = /\b(budget|fiscal|public finance|debt|borrowing|tax(?:ation)?|economic forecast|economic outlook|expenditure|revenue|government programme|reform package)\b/i;
export const isRelevantFinanceMinistryCandidate = (candidate: SourceCandidate) => fiscalTerms.test(`${candidate.title} ${candidate.excerpt}`);
export const financeMinistrySourceAdapter: MorningBriefSourceAdapter = {
  sourceSlug: "finance-ministry-finland", shouldKeepCandidate: isRelevantFinanceMinistryCandidate,
  async fetchCandidates(fetcher: SourceFetch = fetch) {
    const feed = MORNING_BRIEF_FEEDS.find((item) => item.id === "finance-ministry-current-issues"); if (!feed?.enabled) return [];
    const response = await fetchPublicSource(feed.url, { cache: "no-store", headers: { Accept: "text/html" } }, fetcher);
    if (!response.ok) throw new Error(`Finnish Ministry of Finance index unavailable (${response.status}).`);
    return parseOfficialNewsIndex(await response.text(), { sourceSlug: "finance-ministry-finland", indexUrl: feed.url, language: feed.language, maxItems: feed.maxItems, hosts: ["vm.fi"], metadata: { source_family: "official_fiscal_policy", feed_id: feed.id } });
  },
};
