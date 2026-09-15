import assert from "node:assert/strict";
import test from "node:test";
import { createMorningBriefRefreshRunner } from "./refresh-orchestration";

const source = { source: "yle", fetched: 1, parsed: 1, considered: 1, filtered: 0, invalid: 0, stale: 0, outsideBatchLimit: 0, skipped: 0, new: 1, duplicates: 0, classified: 0, reusedClassifications: 0, embedded: 0, reusedEmbeddings: 0, failed: 0 };

test("refresh fetches first, processes bounded batches sequentially, then regenerates", async () => {
  const calls: string[] = []; const batches = [{ processed: 3, failed: 0, remaining: 2, luna: 3, lunaAccepted: 3, terra: 0, embedded: 3, errors: [] }, { processed: 2, failed: 0, remaining: 0, luna: 2, lunaAccepted: 2, terra: 0, embedded: 2, errors: [] }];
  const run = createMorningBriefRefreshRunner({ fetch: async () => { calls.push("fetch"); return { ok: true, summary: { sources: [source], pending: 5 } }; }, processBatch: async () => { calls.push("batch"); return { ok: true, summary: batches.shift()! }; }, regenerate: async () => { calls.push("regenerate"); return { ok: true }; } });
  const result = await run(() => undefined); assert.equal(result.ok, true); assert.deepEqual(calls, ["fetch", "batch", "batch", "regenerate"]); assert.equal(result.processed, 5);
});

test("market refresh is invoked independently and cannot block the article workflow", async () => {
  const calls: string[] = []; const run = createMorningBriefRefreshRunner({ fetch: async () => { calls.push("fetch"); return { ok: true, summary: { sources: [source], pending: 0 } }; }, refreshMarket: async () => { calls.push("market"); return { ok: false, error: "Provider unavailable" }; }, processBatch: async () => { throw new Error("No batch expected"); }, regenerate: async () => { calls.push("regenerate"); return { ok: true }; } });
  const result = await run(() => undefined); assert.equal(result.ok, true); assert.equal(calls.includes("market"), true); assert.equal(calls.includes("regenerate"), true);
});

test("refresh never regenerates partial work and stops a permanently non-progressing batch", async () => {
  const calls: string[] = []; const run = createMorningBriefRefreshRunner({ fetch: async () => ({ ok: true, summary: { sources: [source], pending: 1 } }), processBatch: async () => { calls.push("batch"); return { ok: true, summary: { processed: 0, failed: 1, remaining: 1, luna: 1, lunaAccepted: 0, terra: 0, embedded: 0, errors: ["Permanent failure"] } }; }, regenerate: async () => { calls.push("regenerate"); return { ok: true }; } });
  const result = await run(() => undefined); assert.equal(result.ok, false); assert.equal(result.reason, "processing_failed"); assert.deepEqual(calls, ["batch"]);
});

test("duplicate click cannot create concurrent refresh work", async () => {
  let release!: () => void; const gate = new Promise<void>((resolve) => { release = resolve; }); let fetches = 0;
  const run = createMorningBriefRefreshRunner({ fetch: async () => { fetches += 1; await gate; return { ok: true, summary: { sources: [source], pending: 0 } }; }, processBatch: async () => ({ ok: true, summary: { processed: 0, failed: 0, remaining: 0, luna: 0, lunaAccepted: 0, terra: 0, embedded: 0, errors: [] } }), regenerate: async () => ({ ok: true }) });
  const first = run(() => undefined); const second = await run(() => undefined); release(); await first; assert.equal(second.reason, "already_running"); assert.equal(fetches, 1);
});

test("an immediate identical second refresh reuses duplicates without AI batches and tolerates a failed source", async () => {
  const calls: string[] = []; const partial = { ...source, source: "ecb", fetched: 0, parsed: 0, considered: 0, filtered: 0, invalid: 0, stale: 0, outsideBatchLimit: 0, skipped: 0, new: 0, duplicates: 0, classified: 0, reusedClassifications: 0, embedded: 0, reusedEmbeddings: 0, failed: 1, error: "Timed out" };
  const run = createMorningBriefRefreshRunner({ fetch: async () => ({ ok: true, summary: { sources: [{ ...source, new: 0, duplicates: 1 }, partial], pending: 0 } }), processBatch: async () => { calls.push("batch"); return { ok: true, summary: { processed: 0, failed: 0, remaining: 0, luna: 0, lunaAccepted: 0, terra: 0, embedded: 0, errors: [] } }; }, regenerate: async () => { calls.push("regenerate"); return { ok: true }; } });
  const result = await run(() => undefined); assert.equal(result.ok, true); assert.equal(result.processed, 0); assert.deepEqual(calls, ["regenerate"]); assert.equal(result.sources.some((item) => item.failed > 0), true);
});
