import assert from "node:assert/strict";
import test from "node:test";
import { DAILY_INTELLIGENCE_VERSION, type DailyIntelligence } from "./daily-intelligence-contract";
import { getDailyIntelligenceView } from "./daily-intelligence-ui-state";
import type { DailyIntelligenceFlowResult } from "./daily-intelligence-flow";

const intelligence: DailyIntelligence = { executiveSummary: ["One", "Two", "Three"], mainThemes: [{ title: "A", explanation: "A" }, { title: "B", explanation: "B" }, { title: "C", explanation: "C" }], whyThisMatters: ["One", "Two"], watchNext: ["One", "Two", "Three"], evidenceNote: null, generatedAt: "2026-09-15T09:00:00Z", generationVersion: DAILY_INTELLIGENCE_VERSION };
const assessment = { eligible: true, reason: null as null, previewHeadlines: ["Headline"] };
const result = (state: DailyIntelligenceFlowResult["state"], current: DailyIntelligence | null, eligible = true): DailyIntelligenceFlowResult => ({ state, intelligence: current, cache: null, assessment: state === "missing" ? { ...assessment, eligible } : assessment });

test("Daily Intelligence UI states keep actions explicit and never show a CTA for current intelligence", () => {
  assert.deepEqual(getDailyIntelligenceView(result("missing", null), false, false), { state: "missing", action: "generate", keepsPreviousBrief: false });
  assert.deepEqual(getDailyIntelligenceView(result("current", intelligence), false, false), { state: "current", action: null, keepsPreviousBrief: true });
  assert.deepEqual(getDailyIntelligenceView(result("stale", intelligence), false, false), { state: "stale", action: "update", keepsPreviousBrief: true });
  assert.deepEqual(getDailyIntelligenceView(result("quiet", null), false, false), { state: "quiet", action: null, keepsPreviousBrief: false });
  assert.deepEqual(getDailyIntelligenceView(result("missing", null), true, false), { state: "generating", action: null, keepsPreviousBrief: false });
  assert.deepEqual(getDailyIntelligenceView(result("missing", null), false, true), { state: "failed", action: "retry", keepsPreviousBrief: false });
});

test("thin stale evidence remains readable without an update action", () => {
  const staleThin: DailyIntelligenceFlowResult = { state: "stale", intelligence, cache: "stale", assessment: { eligible: false, reason: "insufficient_materiality", previewHeadlines: [] } };
  assert.deepEqual(getDailyIntelligenceView(staleThin, false, false), { state: "stale", action: null, keepsPreviousBrief: true });
});
