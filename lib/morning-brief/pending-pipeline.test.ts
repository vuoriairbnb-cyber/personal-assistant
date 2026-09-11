import assert from "node:assert/strict";
import test from "node:test";
import { canRegenerateMorningBrief, needsMorningBriefProcessing, remainingMorningBriefWork, selectMorningBriefPendingBatch } from "./pending-pipeline";
import { LIVE_PENDING_BATCH_SIZE } from "./sources/config";

test("only incomplete live articles enter small processing batches", () => {
  const work = [{ id: "complete", classificationCurrent: true, embeddingCurrent: true }, { id: "embedding", classificationCurrent: true, embeddingCurrent: false }, { id: "classification", classificationCurrent: false, embeddingCurrent: false }];
  assert.deepEqual(work.filter(needsMorningBriefProcessing).map((item) => item.id), ["embedding", "classification"]);
  assert.equal(LIVE_PENDING_BATCH_SIZE, 3);
  assert.equal(selectMorningBriefPendingBatch(["a", "b", "c", "d"], LIVE_PENDING_BATCH_SIZE).length, 3);
});

test("completed work is not repeated and a failed article does not prevent the next batch", () => {
  const first = selectMorningBriefPendingBatch([{ id: "failed" }, { id: "done-1" }, { id: "done-2" }, { id: "next" }], LIVE_PENDING_BATCH_SIZE);
  const remaining = remainingMorningBriefWork([{ id: "failed" }, { id: "done-1" }, { id: "done-2" }, { id: "next" }], new Set(["done-1", "done-2"]));
  assert.deepEqual(first.map((item) => item.id), ["failed", "done-1", "done-2"]);
  assert.deepEqual(remaining.map((item) => item.id), ["failed", "next"]);
  assert.deepEqual(selectMorningBriefPendingBatch(remaining, LIVE_PENDING_BATCH_SIZE).map((item) => item.id), ["failed", "next"]);
});

test("fetch, processing, and regeneration states remain independent", () => {
  assert.equal(canRegenerateMorningBrief({ fetching: false, processing: false }), true);
  assert.equal(canRegenerateMorningBrief({ fetching: true, processing: false }), false);
  assert.equal(canRegenerateMorningBrief({ fetching: false, processing: true }), false);
});
