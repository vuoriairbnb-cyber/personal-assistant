import assert from "node:assert/strict";
import test from "node:test";
import { FEEDBACK_STRENGTH, updateLearnedProfile } from "./learning";
import { isCompletedImport, shouldApplyImportSignal } from "./import-dedup";
import type { RankingArticle } from "./ranking";

const article: RankingArticle = { id: "a", title: "Vietnam banking", source: "Reuters", publishedAt: "2026-09-11T06:00:00Z", contentType: "analysis", countries: ["Vietnam"], regions: ["Asia"], categories: ["vietnam"], topics: ["banking"], sectors: ["financials"], companies: [], significance: 60, consequence: 60, scope: 50, summary: "Summary", primarySection: "vietnam" };
test("import is the strongest positive feedback and learns specific dimensions more than source", () => { assert.equal(FEEDBACK_STRENGTH.import, 2); const profile = updateLearnedProfile([], article, "import", new Date("2026-09-11T08:00:00Z")); const topic = profile.find((item) => item.dimensionType === "topic")!; const source = profile.find((item) => item.dimensionType === "source")!; assert.ok(topic.affinityScore > source.affinityScore); });
test("only a completed linked import is idempotently complete", () => { assert.equal(isCompletedImport("completed", "article-id"), true); assert.equal(isCompletedImport("failed", "article-id"), false); assert.equal(isCompletedImport("completed", null), false); });
test("successful first import learns once while duplicates and failures do not", () => { assert.equal(shouldApplyImportSignal(false, "story-id"), true); assert.equal(shouldApplyImportSignal(true, "story-id"), false); assert.equal(shouldApplyImportSignal(false, null), false); });
