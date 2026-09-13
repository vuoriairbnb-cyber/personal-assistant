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
  "statistics-finland": 4,
  "finance-ministry-finland": 3,
  riksbank: 4,
  "norges-bank": 4,
  "vietnam-government": 3,
  "economic-affairs-finland": 3,
  bis: 3,
  "dg-ecfin": 3,
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
  "statistics-finland": 15,
  "finance-ministry-finland": 15,
  riksbank: 20,
  "norges-bank": 20,
  "vietnam-government": 20,
  "economic-affairs-finland": 15,
  bis: 15,
  "dg-ecfin": 15,
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
  { id: "statistics-finland-releases", sourceSlug: "statistics-finland", sourceName: "Statistics Finland", sourceType: "official", url: "https://stat.fi/en", language: "en", enabled: true, maxItems: 15, description: "Statistics Finland latest official releases" },
  { id: "finance-ministry-current-issues", sourceSlug: "finance-ministry-finland", sourceName: "Ministry of Finance Finland", sourceType: "official", url: "https://vm.fi/en/current-issues", language: "en", enabled: true, maxItems: 15, description: "Finnish Ministry of Finance current issues" },
  { id: "riksbank-press", sourceSlug: "riksbank", sourceName: "Sveriges Riksbank", sourceType: "rss", url: "https://www.riksbank.se/sv/rss/pressmeddelanden/", language: "sv", enabled: true, maxItems: 15, description: "Riksbank press releases" },
  { id: "riksbank-monetary-minutes", sourceSlug: "riksbank", sourceName: "Sveriges Riksbank", sourceType: "rss", url: "https://www.riksbank.se/sv/rss/penningpolitiska-protokoll/", language: "sv", enabled: true, maxItems: 10, description: "Riksbank monetary-policy meeting minutes" },
  { id: "norges-bank-financial-stability", sourceSlug: "norges-bank", sourceName: "Norges Bank", sourceType: "rss", url: "https://www.norges-bank.no/en/rss-feeds/Financial-Stability-report---Norges-Bank/", language: "en", enabled: true, maxItems: 10, description: "Norges Bank financial stability reports" },
  { id: "norges-bank-monetary-policy", sourceSlug: "norges-bank", sourceName: "Norges Bank", sourceType: "rss", url: "https://www.norges-bank.no/en/rss-feeds/Norges-Bank-Monetary-Policy-Report-with-financial-stability-assessment/", language: "en", enabled: true, maxItems: 10, description: "Norges Bank monetary policy reports" },
  { id: "vietnam-government-news", sourceSlug: "vietnam-government", sourceName: "Vietnam Government Portal", sourceType: "official", url: "https://en.baochinhphu.vn/", language: "en", enabled: true, maxItems: 20, description: "Vietnam Government Portal economic policy news" },
  { id: "economic-affairs-finland-current-issues", sourceSlug: "economic-affairs-finland", sourceName: "Ministry of Economic Affairs and Employment Finland", sourceType: "official", url: "https://tem.fi/en/current-issues", language: "en", enabled: true, maxItems: 15, description: "Finnish Ministry of Economic Affairs and Employment current issues" },
  { id: "bis-fsi-publications", sourceSlug: "bis", sourceName: "Bank for International Settlements", sourceType: "rss", url: "https://www.bis.org/doclist/bis_fsi_publs.rss", language: "en", enabled: true, maxItems: 15, description: "BIS Financial Stability Institute publications" },
  { id: "dg-ecfin-newsletter", sourceSlug: "dg-ecfin", sourceName: "European Commission DG ECFIN", sourceType: "official", url: "https://economy-finance.ec.europa.eu/economic-and-financial-affairs-newsletter_en", language: "en", enabled: true, maxItems: 15, description: "DG ECFIN economic and financial affairs newsletter" },
];
