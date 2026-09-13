import assert from "node:assert/strict";
import test from "node:test";
import { IMPORT_CLASSIFICATION_VERSION } from "./classification-contract";
import { isRecentLiveMorningBriefArticle, needsLiveMorningBriefClassification } from "./live-processing-contract";

const now = new Date("2026-09-12T12:00:00.000Z");

test("only recent live articles with a stale classifier version need reclassification", () => {
  assert.equal(isRecentLiveMorningBriefArticle("2026-09-11T12:00:00.000Z", now, 48), true);
  assert.equal(needsLiveMorningBriefClassification("morning-brief-claude-classifier-v1", "hash", "hash"), true);
  assert.equal(needsLiveMorningBriefClassification(IMPORT_CLASSIFICATION_VERSION, "hash", "hash"), false);
  assert.equal(isRecentLiveMorningBriefArticle("2026-09-10T11:59:59.000Z", now, 48), false);
});
