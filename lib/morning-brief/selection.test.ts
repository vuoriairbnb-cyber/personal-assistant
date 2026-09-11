import assert from "node:assert/strict";
import test from "node:test";
import { clusterArticles } from "./clustering.ts";
import { MOCK_CORPUS_NOW, MOCK_NEWS_CORPUS } from "./mock-corpus.ts";
import { formatSelectionDebug, selectSectionFeed, selectTopFive } from "./selection.ts";

const stories = () => clusterArticles(MOCK_NEWS_CORPUS, MOCK_CORPUS_NOW);
test("mustConsider does not change base score ordering, but a global event reaches Top 5", () => {
  const ranked = stories(); const global = ranked.find((story) => story.articleIds.includes("global-1"))!;
  assert.ok(ranked.findIndex((story) => story.id === global.id) > 0);
  const top = selectTopFive(ranked); assert.ok(top.selected.some((entry) => entry.cluster.id === global.id));
});
test("Top 5 is deterministic, contains strong Vietnam and credit, and is not five Vietnam stories", () => {
  const first = selectTopFive(stories()); const second = selectTopFive(stories());
  assert.deepEqual(first.selected.map((entry) => entry.cluster.id), second.selected.map((entry) => entry.cluster.id));
  assert.ok(first.selected.some((entry) => entry.cluster.countries.includes("vietnam")));
  assert.ok(first.selected.some((entry) => entry.cluster.score.portfolioMatches.some((match) => match.lens === "Nordic High Yield")));
  assert.ok(first.selected.filter((entry) => entry.cluster.countries.includes("vietnam")).length < 5);
  assert.ok(first.selected.every((entry) => entry.cluster.score.finalScore >= 48 || entry.cluster.score.mustConsider));
});
test("section selectors return story clusters and suppress Vietnam lifestyle noise", () => {
  assert.ok(selectSectionFeed(stories(), "vietnam").every((story) => !story.articleIds.includes("vietnam-tourism-noise")));
  for (const section of ["credit", "finland", "markets", "politics", "emerging_frontier", "vc_pe", "world", "worth_reading"] as const) assert.ok(selectSectionFeed(stories(), section).length > 0);
});
test("debug output exposes base ranking, final selection and exclusion reasons", () => {
  const output = formatSelectionDebug(stories());
  assert.match(output, /BASE RANKING TOP 15/); assert.match(output, /FINAL TOP 5/); assert.match(output, /EXCLUDED/);
});
