import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { clusterArticles } from "./clustering";
import { MOCK_NEWS_CORPUS } from "./mock-corpus";
import { rankStoriesWithLearnedProfile } from "./learning";
import { serializeDiagnosticStory, simulateDiagnosticFloor } from "./live-ranking-diagnostics-contract";
import { selectTopFive, TOP_FIVE_CONFIG } from "./selection";

const now = new Date("2026-09-12T10:00:00.000Z");

test("diagnostic story serialization excludes ids, vectors, bodies, and internal raw data", () => {
  const story = rankStoriesWithLearnedProfile(clusterArticles(MOCK_NEWS_CORPUS.slice(0, 1), now), [], now)[0]!;
  const result = serializeDiagnosticStory(story, { topics: ["rates"], categories: ["markets_macro"], countries: ["Finland"], regions: ["Nordics"], sectors: ["financials"], companies: ["Example"], eventType: "policy", assetClasses: ["credit"], significance: 70, consequence: 60, scope: 50, confidence: 88 });
  const encoded = JSON.stringify(result);
  assert.equal("id" in result, false);
  assert.equal(encoded.includes("embedding"), false);
  assert.equal(encoded.includes("body_text"), false);
  assert.equal(encoded.includes("canonicalUrl"), false);
  assert.deepEqual(result.classification.assetClasses, ["credit"]);
});

test("floor simulation delegates selection to the real Top 5 selector", () => {
  const stories = rankStoriesWithLearnedProfile(clusterArticles(MOCK_NEWS_CORPUS, now), [], now);
  const simulation = simulateDiagnosticFloor(stories, 48);
  const expected = selectTopFive(stories, { ...TOP_FIVE_CONFIG, qualityFloor: 48 });
  assert.equal(simulation.eligibleCountBeforeSelector, stories.filter((story) => story.score.finalScore >= 48).length);
  assert.deepEqual(simulation.selected.map((story) => story.headline), expected.selected.map((entry) => entry.cluster.headline));
});

test("diagnostic implementation imports neither ingestion nor AI-writing helpers", () => {
  const source = readFileSync(new URL("./live-ranking-diagnostics.ts", import.meta.url), "utf8");
  assert.equal(source.includes("./ingestion"), false);
  assert.equal(source.includes("./classification"), false);
  assert.equal(source.includes("ensureArticleEmbeddings"), false);
  assert.equal(source.includes("generateEmbeddings"), false);
});
