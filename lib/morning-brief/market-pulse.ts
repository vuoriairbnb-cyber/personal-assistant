import "server-only";
import { revalidateTag } from "next/cache";
import { fetchWithTimeout } from "./request-timeout";
import { MARKET_INDICES, normalizeYahooMarketChart, type MarketIndexDefinition, type YahooMarketChart } from "./market-pulse-contract";

const CACHE_TAG = "morning-brief-market-pulse";
const TIMEOUT_MS = 8_000;
type Fetcher = typeof fetch;

async function loadOne(definition: MarketIndexDefinition, { cache, fetcher }: { cache: RequestCache; fetcher: Fetcher }) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(definition.yahooSymbol)}?range=5d&interval=1d&events=history`;
  const response = await fetchWithTimeout(url, { headers: { Accept: "application/json" }, cache, next: cache === "force-cache" ? { revalidate: 900, tags: [CACHE_TAG] } : undefined }, TIMEOUT_MS, fetcher);
  if (!response.ok) return null;
  return normalizeYahooMarketChart(definition, await response.json() as YahooMarketChart);
}

export async function getMarketPulse({ forceRefresh = false, fetcher = fetch }: { forceRefresh?: boolean; fetcher?: Fetcher } = {}) {
  const cache: RequestCache = forceRefresh ? "no-store" : "force-cache";
  const settled = await Promise.allSettled(MARKET_INDICES.map((definition) => loadOne(definition, { cache, fetcher })));
  return settled.flatMap((result) => result.status === "fulfilled" && result.value ? [result.value] : []);
}

/** Manual refresh only. Market data has no LLM dependency and failures are isolated. */
export async function refreshMarketPulse() {
  revalidateTag(CACHE_TAG);
  const quotes = await getMarketPulse({ forceRefresh: true });
  return { ok: quotes.length > 0, quotes, refreshed: quotes.length };
}
