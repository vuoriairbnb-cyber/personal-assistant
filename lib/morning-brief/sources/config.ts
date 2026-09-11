import type { MorningBriefFeedConfig } from "./types";

/** Bounded manual-production batch sizes. These limit AI work, not feed discovery. */
export const LIVE_INGESTION_BATCH_LIMITS = {
  yle: 10,
  "bank-of-finland": 5,
  ecb: 5,
} as const;

/** Bounds database deduplication work before AI processing begins. */
export const LIVE_INGESTION_CANDIDATE_LIMITS = {
  yle: 30,
  "bank-of-finland": 15,
  ecb: 15,
} as const;

export const LIVE_SOURCE_FETCH_TIMEOUT_MS = 12_000;
export const LIVE_AI_TIMEOUT_MS = 20_000;
export const LIVE_INGESTION_CONCURRENCY = 2;

/** Exact public endpoints verified from the publishers' own RSS/news pages. */
export const MORNING_BRIEF_FEEDS: readonly MorningBriefFeedConfig[] = [
  { id: "yle-talous", sourceSlug: "yle", sourceName: "Yle", sourceType: "rss", url: "https://yle.fi/rss/t/18-19274/fi", language: "fi", enabled: true, maxItems: 30, description: "Yle Talous" },
  { id: "yle-politiikka", sourceSlug: "yle", sourceName: "Yle", sourceType: "rss", url: "https://yle.fi/rss/t/18-38033/fi", language: "fi", enabled: true, maxItems: 30, description: "Yle Politiikka" },
  { id: "yle-kotimaa", sourceSlug: "yle", sourceName: "Yle", sourceType: "rss", url: "https://yle.fi/rss/t/18-34837/fi", language: "fi", enabled: true, maxItems: 30, description: "Yle Kotimaa" },
  { id: "yle-ulkomaat", sourceSlug: "yle", sourceName: "Yle", sourceType: "rss", url: "https://yle.fi/rss/t/18-34953/fi", language: "fi", enabled: true, maxItems: 30, description: "Yle Ulkomaat" },
  // The Bank of Finland's redesigned site advertises RSS but does not expose a stable news-feed URL.
  // This official, bounded press-release/news index is deliberately the sole HTML-list adapter until one is published.
  { id: "bank-of-finland-news", sourceSlug: "bank-of-finland", sourceName: "Bank of Finland", sourceType: "official", url: "https://www.suomenpankki.fi/en/news-and-topical/press-releases-and-news/", language: "en", enabled: true, maxItems: 30, description: "Bank of Finland official press releases and news" },
  { id: "ecb-press", sourceSlug: "ecb", sourceName: "European Central Bank", sourceType: "rss", url: "https://www.ecb.europa.eu/rss/press.html", language: "en", enabled: true, maxItems: 30, description: "ECB press releases, speeches and interviews" },
  { id: "ecb-statpress", sourceSlug: "ecb", sourceName: "European Central Bank", sourceType: "rss", url: "https://www.ecb.europa.eu/rss/statpress.html", language: "en", enabled: true, maxItems: 30, description: "ECB statistical press releases" },
];
