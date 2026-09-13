import assert from "node:assert/strict";
import test from "node:test";
import { IMPORT_CLASSIFICATION_VERSION, isCurrentMorningBriefClassificationVersion } from "./classification-contract";
import { buildEmbeddingInput, embeddingInputHash } from "./embedding-contract";
import { isRecentLiveMorningBriefArticle, needsLiveMorningBriefClassification } from "./live-processing-contract";
import { calculateImportance, scoreArticle, type RankingArticle } from "./ranking";

const now = new Date("2026-09-12T12:00:00.000Z");
const article: RankingArticle = { id: "live-article", title: "Rates affect funding", source: "European Central Bank", publishedAt: "2026-09-12T10:00:00.000Z", contentType: "news", countries: [], regions: ["Europe"], categories: ["markets_macro"], topics: ["ecb", "rates"], sectors: [], companies: [], eventType: "policy", significance: 3, consequence: 3, scope: 2, summary: "Legacy fixture.", primarySection: "markets" };

test("a recent legacy classification is stale while the calibrated version is current", () => {
  assert.equal(isCurrentMorningBriefClassificationVersion("morning-brief-claude-classifier-v1"), false);
  assert.equal(isCurrentMorningBriefClassificationVersion(IMPORT_CLASSIFICATION_VERSION), true);
  assert.equal(isRecentLiveMorningBriefArticle(article.publishedAt, now, 48), true);
  assert.equal(needsLiveMorningBriefClassification("morning-brief-claude-classifier-v1", "same", "same"), true);
  assert.equal(needsLiveMorningBriefClassification(IMPORT_CLASSIFICATION_VERSION, "same", "same"), false);
});

test("a legacy live classification outside the 48-hour usefulness window is not scheduled", () => {
  assert.equal(isRecentLiveMorningBriefArticle("2026-09-10T11:59:59.000Z", now, 48), false);
});

test("calibrated reclassification changes importance and embedding input hash without duplicating the article", () => {
  const refreshed = { ...article, significance: 55, consequence: 60, scope: 45, summary: "Calibrated fixture." };
  assert.ok(calculateImportance(refreshed) > calculateImportance(article));
  assert.ok(scoreArticle(refreshed, { now, candidates: [refreshed] }).finalScore > scoreArticle(article, { now, candidates: [article] }).finalScore);
  const legacyHash = embeddingInputHash(buildEmbeddingInput({ ...article, excerpt: null, body_text: null, content_type: article.contentType, event_type: article.eventType ?? null }));
  const refreshedHash = embeddingInputHash(buildEmbeddingInput({ ...refreshed, excerpt: null, body_text: null, content_type: refreshed.contentType, event_type: refreshed.eventType ?? null }));
  assert.notEqual(legacyHash, refreshedHash);
  assert.equal(article.id, refreshed.id);
});
