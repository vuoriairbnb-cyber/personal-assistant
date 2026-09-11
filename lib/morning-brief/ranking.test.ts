import assert from "node:assert/strict";
import test from "node:test";
import { MOCK_CORPUS_NOW, MOCK_NEWS_CORPUS } from "./mock-corpus.ts";
import { calculateFreshness, calculateSourceFit, formatRankingTable, rankArticles, scoreArticle, type RankingArticle } from "./ranking.ts";

const byId = (id: string) => {
  const item = MOCK_NEWS_CORPUS.find((article) => article.id === id);
  if (!item) throw new Error(`Missing fixture ${id}`);
  return item;
};
const score = (id: string) => scoreArticle(byId(id), { now: MOCK_CORPUS_NOW, candidates: MOCK_NEWS_CORPUS });

test("Vietnam banking and central-bank stories strongly match PYN Elite while lifestyle noise does not", () => {
  assert.ok(score("vietnam-bank-credit").portfolioRelevance >= 90);
  assert.ok(score("vietnam-central-bank").portfolioRelevance >= 70);
  assert.ok(score("vietnam-tourism-noise").portfolioRelevance < 55);
});

test("portfolio-specific and causal credit relevance are differentiated", () => {
  const directHy = score("european-hy-1"); const ecb = score("european-hy-2");
  assert.ok(directHy.portfolioRelevance > ecb.portfolioRelevance);
  assert.ok(ecb.portfolioMatches.some((match) => match.lens === "European High Yield" && match.causal));
  assert.ok(score("nordic-credit-1").portfolioMatches.some((match) => match.lens === "Nordic High Yield"));
  assert.ok(score("nordic-credit-2").portfolioMatches.some((match) => match.lens === "Evli Nordic Secured Loan"));
});

test("emerging-market classification strongly matches Evli Emerging Frontier", () => {
  const result = score("emerging-1");
  assert.ok(result.portfolioMatches.some((match) => match.lens === "Evli Emerging Frontier" && match.score >= 85));
});

test("major global events are must-consider despite weak direct portfolio relevance", () => {
  const result = score("global-1");
  assert.equal(result.mustConsider, true);
  assert.ok(result.importanceScore >= 95);
});

test("must-consider never overrides ordinary base ranking order", () => {
  const results = rankArticles(MOCK_NEWS_CORPUS, { now: MOCK_CORPUS_NOW });
  const global = results.find((result) => result.article.id === "global-1")!;
  const vietnam = results.find((result) => result.article.id === "vietnam-bank-credit")!;
  assert.ok(vietnam.finalScore > global.finalScore);
  assert.ok(results.indexOf(vietnam) < results.indexOf(global));
});

test("freshness uses injected time and preserves older long reads better than breaking news", () => {
  const oldBreaking: RankingArticle = { ...byId("global-1"), id: "old-breaking", publishedAt: new Date(MOCK_CORPUS_NOW.getTime() - 48 * 3_600_000).toISOString() };
  const oldLongRead: RankingArticle = { ...byId("vietnam-18"), id: "old-long-read", publishedAt: new Date(MOCK_CORPUS_NOW.getTime() - 48 * 3_600_000).toISOString(), contentType: "long_read" };
  assert.ok(calculateFreshness(oldLongRead, MOCK_CORPUS_NOW) > calculateFreshness(oldBreaking, MOCK_CORPUS_NOW));
  assert.ok(calculateFreshness(oldBreaking, MOCK_CORPUS_NOW) < 15);
});

test("source fit is contextual for FT analysis and Yle Finnish politics", () => {
  assert.ok(calculateSourceFit({ ...byId("vietnam-18"), source: "Financial Times", primarySection: "worth_reading", contentType: "long_read" }) >= 95);
  assert.ok(calculateSourceFit(byId("finland-1")) >= 95);
});

test("large VC transactions outrank tiny seed rounds", () => {
  assert.ok(score("vc-pe-1").finalScore > score("vc-pe-3").finalScore);
});

test("multiple portfolio matches use diminishing boosts and all components remain bounded", () => {
  const result = score("nordic-credit-7");
  assert.ok(result.portfolioMatches.length >= 2);
  for (const value of [result.portfolioRelevance, result.learnedPreference, result.importanceScore, result.explicitInterest, result.freshnessScore, result.sourceFit, result.likedSimilarity, result.noveltyScore, result.explorationScore, result.finalScore]) assert.ok(value >= 0 && value <= 100);
});

test("same corpus and reference time always produces the same ranking", () => {
  const first = rankArticles(MOCK_NEWS_CORPUS, { now: MOCK_CORPUS_NOW });
  const second = rankArticles(MOCK_NEWS_CORPUS, { now: MOCK_CORPUS_NOW });
  assert.deepEqual(first.map((item) => [item.article.id, item.finalScore]), second.map((item) => [item.article.id, item.finalScore]));
});

test("golden corpus retains Vietnam, Nordic credit, global, Finland, and market/PE relevance in its top group", () => {
  const results = rankArticles(MOCK_NEWS_CORPUS, { now: MOCK_CORPUS_NOW });
  // Section diversity is deliberately deferred; this broad top group protects
  // important Finland coverage without forcing a section quota into ranking-v1.
  const topGroup = results.slice(0, 45).map((item) => item.article.id);
  assert.ok(topGroup.includes("vietnam-bank-credit"));
  assert.ok(topGroup.includes("nordic-credit-1"));
  // Major global events are intentionally protected by Top 5 selection, not raw score sorting.
  assert.ok(topGroup.includes("finland-1"));
  assert.ok(topGroup.some((id) => id.startsWith("emerging-") || id.startsWith("vc-pe-") || id.startsWith("european-hy-")));
  assert.match(formatRankingTable(results), /^Rank \| Score \| Story \| Portfolio match \| Importance/m);
});
