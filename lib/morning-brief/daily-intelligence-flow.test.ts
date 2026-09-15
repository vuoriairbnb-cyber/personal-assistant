import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { DAILY_INTELLIGENCE_VERSION, buildDailyIntelligenceInput, dailyIntelligenceInputHash, type DailyIntelligence, type DailyIntelligenceInput } from "./daily-intelligence-contract";
import { resolveDailyIntelligenceFlow, type DailyIntelligenceCacheRecord, type DailyIntelligenceFlowDependencies } from "./daily-intelligence-flow";
import { createMorningBriefRefreshRunner } from "./refresh-orchestration";

const input = (contentHash = "content-a", preferenceWeight = 90): DailyIntelligenceInput => buildDailyIntelligenceInput({ brief: { id: "brief-a", date: "2026-09-15", version: 1, algorithmVersion: "ranking-v1", classificationVersion: "v2" }, stories: ["a", "b", "c", "d"].map((id, index) => ({ clusterId: `cluster-${id}`, section: index < 2 ? "top_5" : index === 2 ? "credit" : "markets", rank: index + 1, headline: `Headline ${id}`, summary: "Summary", sources: [`Public source ${index + 1}`], contentHashes: [index === 0 ? contentHash : `content-${id}`], signal: { importance: 70, portfolioRelevance: 65, learnedPreference: preferenceWeight, sourceCount: 1, recencyHours: 12 }, classification: null })), personalization: { portfolioLenses: [], preferences: [{ type: "topic", key: "markets", weight: preferenceWeight, pinned: false }], learnedInterests: [] }, market: [] });
const intelligence = (): DailyIntelligence => ({ executiveSummary: ["One.", "Two.", "Three."], mainThemes: [{ title: "A", explanation: "A." }, { title: "B", explanation: "B." }, { title: "C", explanation: "C." }], whyThisMatters: ["One.", "Two."], watchNext: ["One.", "Two.", "Three."], evidenceNote: null, generatedAt: "2026-09-15T09:00:00.000Z", generationVersion: DAILY_INTELLIGENCE_VERSION });
function harness(currentInput = input()) { let cache: DailyIntelligenceCacheRecord | null = null; let terraCalls = 0; let writes = 0; const dependencies: DailyIntelligenceFlowDependencies = { loadInput: async () => currentInput, readCache: async () => cache, synthesize: async () => { terraCalls += 1; return intelligence(); }, persist: async (record) => { writes += 1; cache = record; return record; } }; return { dependencies, setInput: (next: DailyIntelligenceInput) => { currentInput = next; }, setCache: (next: DailyIntelligenceCacheRecord | null) => { cache = next; }, failNextSynthesis: () => { dependencies.synthesize = async () => { terraCalls += 1; throw new Error("Terra unavailable"); }; }, counts: () => ({ terraCalls, writes }), cache: () => cache }; }

test("A: dashboard read with no cache is AI-free, write-free, and reports missing", async () => {
  const h = harness(); const result = await resolveDailyIntelligenceFlow("user-a", false, h.dependencies);
  assert.equal(result.state, "missing"); assert.equal(result.intelligence, null); assert.equal(result.cache, null); assert.equal(result.assessment?.eligible, true); assert.deepEqual(h.counts(), { terraCalls: 0, writes: 0 });
});

test("B: Refresh orchestration has no Daily Intelligence generation path while market refresh remains independent", async () => {
  let marketCalls = 0; const run = createMorningBriefRefreshRunner({ fetch: async () => ({ ok: true, summary: { sources: [], pending: 0 } }), processBatch: async () => { throw new Error("Unexpected batch"); }, regenerate: async () => ({ ok: true }), refreshMarket: async () => { marketCalls += 1; return { ok: true }; } });
  const result = await run(() => undefined); const orchestration = readFileSync(join(process.cwd(), "lib", "morning-brief", "refresh-orchestration.ts"), "utf8"); assert.equal(result.ok, true); assert.equal(marketCalls, 1); assert.equal(orchestration.includes("daily-intelligence"), false);
});

test("C: explicit Generate calls Terra once and persists the validated user-specific cache record once", async () => {
  const h = harness(); const result = await resolveDailyIntelligenceFlow("user-a", true, h.dependencies); const saved = h.cache();
  assert.equal(result.cache, "generated"); assert.deepEqual(h.counts(), { terraCalls: 1, writes: 1 }); assert.ok(saved); assert.equal(saved!.userId, "user-a"); assert.equal(saved!.inputHash, dailyIntelligenceInputHash(input())); assert.equal(saved!.generationVersion, DAILY_INTELLIGENCE_VERSION); assert.equal(result.intelligence?.mainThemes.length, 3);
});

test("D: a valid unchanged cache prevents an additional Terra call and write", async () => {
  const h = harness(); await resolveDailyIntelligenceFlow("user-a", true, h.dependencies); const first = h.counts(); const result = await resolveDailyIntelligenceFlow("user-a", true, h.dependencies);
  assert.equal(result.cache, "hit"); assert.deepEqual(first, { terraCalls: 1, writes: 1 }); assert.deepEqual(h.counts(), first);
});

test("E: stale story or profile input remains read-only until an explicit Generate safely upserts it", async () => {
  const h = harness(); await resolveDailyIntelligenceFlow("user-a", true, h.dependencies); h.setInput(input("changed-content", 91));
  const stale = await resolveDailyIntelligenceFlow("user-a", false, h.dependencies); assert.equal(stale.state, "stale"); assert.deepEqual(h.counts(), { terraCalls: 1, writes: 1 });
  const generated = await resolveDailyIntelligenceFlow("user-a", true, h.dependencies); assert.equal(generated.cache, "generated"); assert.deepEqual(h.counts(), { terraCalls: 2, writes: 2 }); assert.equal(h.cache()!.inputHash, dailyIntelligenceInputHash(input("changed-content", 91)));
});

test("F: a Terra failure writes nothing and preserves an existing valid cache for retry", async () => {
  const h = harness(); await resolveDailyIntelligenceFlow("user-a", true, h.dependencies); const before = h.cache(); h.setInput(input("changed-content")); h.failNextSynthesis();
  await assert.rejects(() => resolveDailyIntelligenceFlow("user-a", true, h.dependencies), /Terra unavailable/); assert.deepEqual(h.counts(), { terraCalls: 2, writes: 1 }); assert.equal(h.cache(), before);
});

test("G/H/I: thin evidence produces a deterministic quiet state with no Terra call or cache write", async () => {
  const thin = buildDailyIntelligenceInput({ ...input(), stories: [{ clusterId: "thin", section: "top_5", rank: 1, headline: "Limited update", summary: "Small update", sources: ["One source"], contentHashes: ["thin"], signal: { importance: 45, portfolioRelevance: 30, learnedPreference: 30, sourceCount: 1, recencyHours: 12 }, classification: null }] });
  const h = harness(thin); const result = await resolveDailyIntelligenceFlow("user-a", true, h.dependencies);
  assert.equal(result.state, "quiet"); assert.equal(result.assessment?.eligible, false); assert.deepEqual(result.assessment?.previewHeadlines, ["Limited update"]); assert.deepEqual(h.counts(), { terraCalls: 0, writes: 0 });
});

test("stale cache remains readable and does not auto-generate", async () => {
  const h = harness(); await resolveDailyIntelligenceFlow("user-a", true, h.dependencies); h.setInput(input("changed-content"));
  const result = await resolveDailyIntelligenceFlow("user-a", false, h.dependencies);
  assert.equal(result.state, "stale"); assert.ok(result.intelligence); assert.equal(result.cache, "stale"); assert.deepEqual(h.counts(), { terraCalls: 1, writes: 1 });
});
