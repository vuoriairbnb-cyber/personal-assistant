import assert from "node:assert/strict";
import test from "node:test";
import { limitCandidates, mapBounded } from "./ingestion-runtime";
import { LIVE_INGESTION_BATCH_LIMITS, LIVE_INGESTION_CANDIDATE_LIMITS, LIVE_INGESTION_CONCURRENCY } from "./sources/config";

test("candidate limits are deterministic and bounded workers preserve item order", async () => {
  assert.deepEqual(limitCandidates([1, 2, 3, 4], 2), [1, 2]); const active: number[] = []; let peak = 0; const result = await mapBounded([1, 2, 3, 4], 2, async (value) => { active.push(value); peak = Math.max(peak, active.length); await Promise.resolve(); active.splice(active.indexOf(value), 1); return value * 2; }); assert.deepEqual(result, [2, 4, 6, 8]); assert.equal(peak <= 2, true);
});

test("production live-ingestion limits are intentionally small", () => {
  assert.deepEqual(LIVE_INGESTION_BATCH_LIMITS, { yle: 10, "bank-of-finland": 5, ecb: 5, "pyn-elite": 4, "vietnam-statistics": 3, "federal-reserve": 5, eurostat: 4, "statistics-finland": 4, "finance-ministry-finland": 3, riksbank: 4, "norges-bank": 4, "vietnam-government": 3, "economic-affairs-finland": 3, bis: 3, "dg-ecfin": 3 });
  assert.deepEqual(LIVE_INGESTION_CANDIDATE_LIMITS, { yle: 30, "bank-of-finland": 15, ecb: 15, "pyn-elite": 12, "vietnam-statistics": 8, "federal-reserve": 15, eurostat: 10, "statistics-finland": 15, "finance-ministry-finland": 15, riksbank: 20, "norges-bank": 20, "vietnam-government": 20, "economic-affairs-finland": 15, bis: 15, "dg-ecfin": 15 });
  assert.equal(LIVE_INGESTION_CONCURRENCY, 2);
});
