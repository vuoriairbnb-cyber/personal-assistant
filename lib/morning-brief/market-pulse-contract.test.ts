import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { MARKET_INDICES, MARKET_PULSE_TEST_FIXTURES, normalizeYahooMarketChart } from "./market-pulse-contract";

test("market fixtures demonstrate all four indices with clearly supplied five-day history", () => {
  assert.deepEqual(MARKET_PULSE_TEST_FIXTURES.map((quote) => quote.symbol), ["OMXH25", "S&P 500", "STOXX Europe 600", "VN-Index"]);
  assert.equal(MARKET_PULSE_TEST_FIXTURES.every((quote) => quote.points.length === 5 && quote.status === "delayed_or_eod"), true);
});

test("Yahoo normalization retains actual supplied close points without fabricating missing history", () => {
  const quote = normalizeYahooMarketChart(MARKET_INDICES[0]!, { chart: { result: [{ meta: { regularMarketPrice: 5_248.3, previousClose: 5_210.8, regularMarketTime: 1_789_394_400, currency: "EUR" }, timestamp: [1_789_048_800, 1_789_394_400], indicators: { quote: [{ close: [5_210.8, null] }] } }] } });
  assert.ok(quote); assert.deepEqual(quote.points.map((point) => point.value), [5_210.8]);
  assert.equal(quote.absoluteChange, 37.5);
});

test("missing whole quote is representable and the UI falls back without inventing a sparkline", () => {
  assert.equal(normalizeYahooMarketChart(MARKET_INDICES[0]!, { chart: { result: [{ meta: {}, timestamp: [], indicators: { quote: [{ close: [] }] } }] } }), null);
  const ui = readFileSync(join(process.cwd(), "components", "morning-brief", "MarketPulse.tsx"), "utf8");
  assert.equal(ui.includes("quote.points.length < 2"), true);
  assert.equal(ui.includes("Quote unavailable"), true);
});

test("market refresh contains no LLM or classification dependency", () => {
  const source = readFileSync(join(process.cwd(), "lib", "morning-brief", "market-pulse.ts"), "utf8").toLowerCase();
  assert.equal(source.includes("openai"), false); assert.equal(source.includes("classif"), false); assert.equal(source.includes("terra"), false); assert.equal(source.includes("luna"), false);
});
