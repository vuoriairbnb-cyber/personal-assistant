import { MORNING_BRIEF_FEEDS } from "./config";
import { fetchPublicSource } from "./http";
import { rssCandidates } from "./rss";
import type { MorningBriefSourceAdapter, SourceCandidate, SourceFetch } from "./types";

const relevant = /\b(credit|debt|bank(?:ing)?|funding|liquidity|foreign exchange|\bfx\b|financial conditions|monetary transmission|financial stability|international banking|debt service|capital|market liquidity|corporate financ)\b/i;
/** Keeps BIS research focused on system-wide funding, credit, banking, and financial-condition work. */
export const isRelevantBisCandidate = (candidate: SourceCandidate) => relevant.test(`${candidate.title} ${candidate.excerpt} ${candidate.categories.join(" ")}`);
export const bisSourceAdapter: MorningBriefSourceAdapter = {
  sourceSlug: "bis", shouldKeepCandidate: isRelevantBisCandidate,
  async fetchCandidates(fetcher: SourceFetch = fetch) {
    const feed = MORNING_BRIEF_FEEDS.find((item) => item.id === "bis-fsi-publications"); if (!feed?.enabled) return [];
    const response = await fetchPublicSource(feed.url, { cache: "no-store", headers: { Accept: "application/rss+xml, application/xml, text/xml" } }, fetcher);
    if (!response.ok) throw new Error(`BIS FSI publication feed unavailable (${response.status}).`);
    return rssCandidates(await response.text(), { sourceSlug: "bis", language: feed.language, feedUrl: feed.url, maxItems: feed.maxItems })
      .map((candidate) => ({ ...candidate, contentType: "long_read" as const, rawMetadata: { ...candidate.rawMetadata, source_family: "official_systemic_research", freshness_class: "long_form_research", feed_id: feed.id } }));
  },
};
