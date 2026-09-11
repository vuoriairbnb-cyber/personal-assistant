import assert from "node:assert/strict";
import test from "node:test";
import { formatIngestionSummary, runWithLoading } from "./action-state";

test("loading always resets after an action failure", async () => {
  const values: boolean[] = []; await assert.rejects(runWithLoading((value) => values.push(value), async () => { throw new Error("network"); })); assert.deepEqual(values, [true, false]);
});
test("production-safe ingestion summaries retain source-specific failures", () => {
  assert.equal(formatIngestionSummary([{ source: "yle", fetched: 10, parsed: 10, considered: 2, filtered: 0, new: 2, duplicates: 8, classified: 2, reusedClassifications: 8, embedded: 2, reusedEmbeddings: 0, failed: 0 }, { source: "ecb", fetched: 0, parsed: 0, considered: 0, filtered: 0, new: 0, duplicates: 0, classified: 0, reusedClassifications: 0, embedded: 0, reusedEmbeddings: 0, failed: 1, error: "Source request timed out after 12s." }]), "Live source fetch partially failed. yle: 10 fetched, 2 new, 8 duplicates · ecb: Source request timed out after 12s.");
});
