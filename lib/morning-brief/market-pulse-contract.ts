export type MarketQuoteStatus = "delayed_or_eod" | "unavailable";

export type MarketQuotePoint = { at: string; value: number };

export type MarketQuote = {
  symbol: string;
  label: string;
  value: number;
  absoluteChange: number;
  percentChange: number;
  currency: string | null;
  asOf: string;
  status: Exclude<MarketQuoteStatus, "unavailable">;
  points: MarketQuotePoint[];
};

export type MarketIndexDefinition = { symbol: string; label: string; yahooSymbol: string };
export type YahooMarketChart = { chart?: { result?: Array<{ meta?: { regularMarketPrice?: number; previousClose?: number; chartPreviousClose?: number; regularMarketChange?: number; regularMarketChangePercent?: number; regularMarketTime?: number; currency?: string }; timestamp?: number[]; indicators?: { quote?: Array<{ close?: Array<number | null> }> } }> } };

/** All indices use the same provider convention: five recent trading-day closes. */
export const MARKET_INDICES: readonly MarketIndexDefinition[] = [
  { symbol: "OMXH25", label: "OMX Helsinki 25", yahooSymbol: "^OMXH25" },
  { symbol: "S&P 500", label: "S&P 500", yahooSymbol: "^GSPC" },
  { symbol: "STOXX Europe 600", label: "STOXX Europe 600", yahooSymbol: "^STOXX" },
  { symbol: "VN-Index", label: "VN-Index", yahooSymbol: "0P0000HY8X.VN" },
];

const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

/** Normalizes only actual returned close points; it never creates or interpolates history. */
export function normalizeYahooMarketChart(definition: MarketIndexDefinition, payload: YahooMarketChart): MarketQuote | null {
  const result = payload.chart?.result?.[0]; const meta = result?.meta; const closes = result?.indicators?.quote?.[0]?.close ?? []; const timestamps = result?.timestamp ?? [];
  const points: MarketQuotePoint[] = closes.flatMap((close, index) => finite(close) && finite(timestamps[index]) ? [{ at: new Date(timestamps[index]! * 1_000).toISOString(), value: close }] : []);
  const value = finite(meta?.regularMarketPrice) ? meta.regularMarketPrice : points.at(-1)?.value;
  const previousClose = finite(meta?.previousClose) ? meta.previousClose : finite(meta?.chartPreviousClose) ? meta.chartPreviousClose : points.at(-2)?.value;
  if (!finite(value) || !finite(previousClose) || previousClose === 0) return null;
  const absoluteChange = finite(meta?.regularMarketChange) ? meta.regularMarketChange : value - previousClose;
  const percentChange = finite(meta?.regularMarketChangePercent) ? meta.regularMarketChangePercent : (absoluteChange / previousClose) * 100;
  const asOf = finite(meta?.regularMarketTime) ? new Date(meta.regularMarketTime * 1_000).toISOString() : points.at(-1)?.at;
  if (!asOf) return null;
  return { symbol: definition.symbol, label: definition.label, value, absoluteChange, percentChange, currency: meta?.currency ?? null, asOf, status: "delayed_or_eod", points };
}

export const MARKET_PULSE_TEST_FIXTURES: MarketQuote[] = [
  { symbol: "OMXH25", label: "OMX Helsinki 25", value: 5_248.3, absoluteChange: 37.5, percentChange: 0.72, currency: "EUR", asOf: "2026-09-14T14:30:00.000Z", status: "delayed_or_eod", points: [{ at: "2026-09-08", value: 5_161.1 }, { at: "2026-09-09", value: 5_188.4 }, { at: "2026-09-10", value: 5_174.2 }, { at: "2026-09-11", value: 5_210.8 }, { at: "2026-09-14", value: 5_248.3 }] },
  { symbol: "S&P 500", label: "S&P 500", value: 6_482.1, absoluteChange: -18.6, percentChange: -0.29, currency: "USD", asOf: "2026-09-14T14:30:00.000Z", status: "delayed_or_eod", points: [{ at: "2026-09-08", value: 6_437.8 }, { at: "2026-09-09", value: 6_469.2 }, { at: "2026-09-10", value: 6_501.6 }, { at: "2026-09-11", value: 6_500.7 }, { at: "2026-09-14", value: 6_482.1 }] },
  { symbol: "STOXX Europe 600", label: "STOXX Europe 600", value: 552.4, absoluteChange: 2.1, percentChange: 0.38, currency: "EUR", asOf: "2026-09-14T14:30:00.000Z", status: "delayed_or_eod", points: [{ at: "2026-09-08", value: 545.1 }, { at: "2026-09-09", value: 548.3 }, { at: "2026-09-10", value: 547.7 }, { at: "2026-09-11", value: 550.3 }, { at: "2026-09-14", value: 552.4 }] },
  { symbol: "VN-Index", label: "VN-Index", value: 1_673.8, absoluteChange: 9.4, percentChange: 0.56, currency: "VND", asOf: "2026-09-14T14:30:00.000Z", status: "delayed_or_eod", points: [{ at: "2026-09-08", value: 1_650.1 }, { at: "2026-09-09", value: 1_658.5 }, { at: "2026-09-10", value: 1_653.4 }, { at: "2026-09-11", value: 1_664.4 }, { at: "2026-09-14", value: 1_673.8 }] },
];
