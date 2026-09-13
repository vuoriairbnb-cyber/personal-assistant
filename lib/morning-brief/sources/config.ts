import type { MorningBriefFeedConfig } from "./types";

/** Bounded manual-production batch sizes. These limit AI work, not feed discovery. */
export const LIVE_INGESTION_BATCH_LIMITS: Record<string, number> = {
  yle: 10,
  "bank-of-finland": 5,
  ecb: 5,
  "pyn-elite": 4,
  "vietnam-statistics": 3,
  "federal-reserve": 5,
  eurostat: 4,
};

/** Bounds database deduplication work before AI processing begins. */
export const LIVE_INGESTION_CANDIDATE_LIMITS: Record<string, number> = {
  yle: 30,
  "bank-of-finland": 15,
  ecb: 15,
  "pyn-elite": 12,
  "vietnam-statistics": 8,
  "federal-reserve": 15,
  eurostat: 10,
};

export const LIVE_SOURCE_FETCH_TIMEOUT_MS = 12_000;
export const LIVE_AI_TIMEOUT_MS = 20_000;
export const LIVE_INGESTION_CONCURRENCY = 2;
/** One resumable request processes at most this many articles. */
export const LIVE_PENDING_BATCH_SIZE = 3;
/** Keeps a Luna → Terra → embedding path comfortably below the Vercel limit. */
export const LIVE_PENDING_AI_TIMEOUT_MS = 8_000;
export const LIVE_PENDING_SCAN_LIMIT = 100;

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
  // The URLs below were verified from each institution's own public RSS/news pages.
  { id: "federal-reserve-monetary", sourceSlug: "federal-reserve", sourceName: "Federal Reserve", sourceType: "rss", url: "https://www.federalreserve.gov/feeds/press_monetary.xml", language: "en", enabled: true, maxItems: 20, description: "Federal Reserve monetary-policy press releases" },
  { id: "federal-reserve-speeches", sourceSlug: "federal-reserve", sourceName: "Federal Reserve", sourceType: "rss", url: "https://www.federalreserve.gov/feeds/speeches.xml", language: "en", enabled: true, maxItems: 15, description: "Federal Reserve speeches" },
  { id: "eurostat-economy-finance", sourceSlug: "eurostat", sourceName: "Eurostat", sourceType: "rss", url: "https://ec.europa.eu/eurostat/en/search?_estatsearchportlet_WAR_estatsearchportlet_collection=CAT_PREREL&_estatsearchportlet_WAR_estatsearchportlet_theme=PER_ECOFIN&p_p_id=estatsearchportlet_WAR_estatsearchportlet&p_p_lifecycle=2&p_p_mode=view&p_p_resource_id=atom&p_p_state=maximized", language: "en", enabled: true, maxItems: 20, description: "Eurostat economy and finance news releases" },
  { id: "pyn-elite-news", sourceSlug: "pyn-elite", sourceName: "PYN Elite", sourceType: "official", url: "https://www.pyn.fi/en/news/", language: "en", enabled: true, maxItems: 20, description: "PYN Elite public fund news, monthly reviews and investor letters" },
  { id: "vietnam-statistics-press-room", sourceSlug: "vietnam-statistics", sourceName: "National Statistics Office of Vietnam", sourceType: "official", url: "https://www.nso.gov.vn/en/press-room/", language: "en", enabled: true, maxItems: 20, description: "Vietnam official macroeconomic press releases" },
];
