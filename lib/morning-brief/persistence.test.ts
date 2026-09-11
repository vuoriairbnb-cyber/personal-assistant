import assert from "node:assert/strict";
import test from "node:test";
import { clusterArticles } from "./clustering.ts";
import { MOCK_CORPUS_NOW, MOCK_NEWS_CORPUS } from "./mock-corpus.ts";
import { selectSectionFeed } from "./selection.ts";

test("mock persistence plan is deterministic and has unique ranks inside every section", () => {
  const first = clusterArticles(MOCK_NEWS_CORPUS, MOCK_CORPUS_NOW); const second = clusterArticles(MOCK_NEWS_CORPUS, MOCK_CORPUS_NOW);
  assert.deepEqual(first.map((story) => story.id), second.map((story) => story.id));
  for (const section of ["top_5", "vietnam", "credit", "finland", "markets", "politics", "emerging_frontier", "vc_pe", "world", "worth_reading"] as const) {
    const selected = selectSectionFeed(first, section, section === "top_5" ? 5 : 20);
    assert.equal(new Set(selected.map((story) => story.id)).size, selected.length);
  }
});
test("cluster data remains safe for a detail view without an image or handcrafted briefing", () => {
  const story = clusterArticles(MOCK_NEWS_CORPUS, MOCK_CORPUS_NOW).find((item) => item.articleIds.includes("vietnam-tourism-noise"))!;
  assert.equal(story.displayImageUrl, null); assert.ok(story.summary.length > 0); assert.ok(story.relatedCoverage.length > 0);
});
