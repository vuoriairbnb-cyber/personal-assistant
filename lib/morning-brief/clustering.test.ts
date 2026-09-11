import assert from "node:assert/strict";
import test from "node:test";
import { clusterArticles, normalizeTitle } from "./clustering.ts";
import { MOCK_CORPUS_NOW, MOCK_NEWS_CORPUS } from "./mock-corpus.ts";

const stories = () => clusterArticles(MOCK_NEWS_CORPUS, MOCK_CORPUS_NOW);
const clusterContaining = (id: string) => { const story = stories().find((item) => item.articleIds.includes(id)); if (!story) throw new Error(`Missing ${id}`); return story; };

test("normalizes harmless title decoration without aggressive stemming", () => {
  assert.equal(normalizeTitle("Breaking: Vietnam lenders — Reuters"), "vietnam lenders");
  assert.notEqual(normalizeTitle("Vietnam banks expand credit"), normalizeTitle("Vietnam property prices rise"));
});
test("Fed, Vietnam lending and Finnish fiscal fixture coverage forms deterministic multi-source clusters", () => {
  assert.equal(clusterContaining("global-3").articleIds.length, 3);
  assert.equal(clusterContaining("vietnam-bank-credit").articleIds.length, 3);
  assert.equal(clusterContaining("finland-1").articleIds.length, 3);
});
test("unrelated Vietnam banking and property stories do not cluster from country alone", () => {
  assert.notEqual(clusterContaining("vietnam-bank-credit").id, clusterContaining("vietnam-4").id);
});
test("exact canonical URL duplicates cluster and primary choice is deterministic", () => {
  const base = MOCK_NEWS_CORPUS.find((item) => item.id === "vietnam-central-bank")!;
  const duplicate = { ...base, id: "url-duplicate", source: "BBC", canonicalUrl: "https://example.test/shared" };
  const original = { ...base, canonicalUrl: "https://example.test/shared" };
  const first = clusterArticles([original, duplicate], MOCK_CORPUS_NOW)[0]!; const second = clusterArticles([duplicate, original], MOCK_CORPUS_NOW)[0]!;
  assert.equal(first.articleIds.length, 2); assert.equal(first.primaryArticleId, second.primaryArticleId);
});
test("related coverage retains analysis and image fallback is resolved at cluster level", () => {
  const story = clusterContaining("vietnam-bank-credit");
  assert.ok(story.relatedCoverage.some((coverage) => coverage.relationType === "analysis"));
  assert.equal(story.displayImageUrl, "/morning-brief/mock/vietnam-banking.png");
  assert.equal(story.sourceCount, 3);
});
