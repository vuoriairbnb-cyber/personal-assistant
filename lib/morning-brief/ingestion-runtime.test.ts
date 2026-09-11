import assert from "node:assert/strict";
import test from "node:test";
import { limitCandidates, mapBounded } from "./ingestion-runtime";
import { LIVE_INGESTION_BATCH_LIMITS, LIVE_INGESTION_CANDIDATE_LIMITS, LIVE_INGESTION_CONCURRENCY } from "./sources/config";

test("candidate limits are deterministic and bounded workers preserve item order", async () => {
  assert.deepEqual(limitCandidates([1, 2, 3, 4], 2), [1, 2]); const active: number[] = []; let peak = 0; const result = await mapBounded([1, 2, 3, 4], 2, async (value) => { active.push(value); peak = Math.max(peak, active.length); await Promise.resolve(); active.splice(active.indexOf(value), 1); return value * 2; }); assert.deepEqual(result, [2, 4, 6, 8]); assert.equal(peak <= 2, true);
});

test("production live-ingestion limits are intentionally small", () => {
  assert.deepEqual(LIVE_INGESTION_BATCH_LIMITS, { yle: 10, "bank-of-finland": 5, ecb: 5 });
  assert.deepEqual(LIVE_INGESTION_CANDIDATE_LIMITS, { yle: 30, "bank-of-finland": 15, ecb: 15 });
  assert.equal(LIVE_INGESTION_CONCURRENCY, 2);
});
