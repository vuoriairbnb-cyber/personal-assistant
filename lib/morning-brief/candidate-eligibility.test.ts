import assert from "node:assert/strict";
import test from "node:test";
import { isMockMorningBriefCandidate, isProductionMorningBriefCandidate, productionMorningBriefCandidates } from "./candidate-eligibility";
import { clusterArticles } from "./clustering";
import type { RankingArticle } from "./ranking";
import { selectSectionFeed, selectTopFive } from "./selection";

test("production candidates exclude all durable mock markers", () => {
  for (const mock of [
    { sourceMetadata: { development_mock: true } },
    { articleMetadata: { development_mock: true } },
    { canonicalUrl: "https://mock.local/fixture/story" },
    { classificationVersion: "mock-classifier-v1" },
  ]) {
    assert.equal(isMockMorningBriefCandidate(mock), true);
    assert.equal(isProductionMorningBriefCandidate(mock), false);
  }
});

test("a trusted live source keeps legacy real rows eligible even if an old mock seeder corrupted source metadata", () => {
  const legacyYle = { sourceSlug: "yle", sourceMetadata: { development_mock: true }, articleMetadata: { live_public_source: true }, canonicalUrl: "https://yle.fi/a", classificationVersion: "morning-brief-claude-classifier-v1" };
  assert.equal(isMockMorningBriefCandidate(legacyYle), false);
  assert.equal(isProductionMorningBriefCandidate(legacyYle), true);
});

test("explicit real Yle, ECB, Bank of Finland, and imported markers remain eligible", () => {
  for (const candidate of [
    { sourceMetadata: { live_public_source: true }, canonicalUrl: "https://yle.fi/a" },
    { sourceMetadata: { live_public_source: true }, canonicalUrl: "https://ecb.europa.eu/a" },
    { sourceMetadata: { live_public_source: true }, canonicalUrl: "https://suomenpankki.fi/a" },
    { sourceMetadata: { imported: true }, articleMetadata: { imported: true }, canonicalUrl: "https://example.com/a" },
  ]) assert.equal(isProductionMorningBriefCandidate(candidate), true);
});

test("production section feeds and Top 5 receive no mock candidate while the quality floor remains active", () => {
  const now = new Date("2026-09-12T12:00:00.000Z");
  const article = (id: string, markers: Record<string, unknown>, significance: number): RankingArticle & { sourceMetadata: Record<string, unknown> } => ({ id, sourceMetadata: markers, title: id, source: "Yle", publishedAt: now.toISOString(), contentType: "news", countries: ["finland"], regions: ["nordics"], categories: ["finland_business"], topics: [id], sectors: ["industrials"], companies: [], significance, consequence: significance, scope: significance, summary: id, primarySection: "finland" });
  const candidates = productionMorningBriefCandidates([
    article("mock-high-score", { development_mock: true }, 100),
    article("live-strong", { live_public_source: true }, 90),
    article("live-weak", { live_public_source: true }, 10),
  ]);
  const stories = clusterArticles(candidates, now);
  assert.equal(stories.some((story) => story.articleIds.includes("mock-high-score")), false);
  assert.ok(selectTopFive(stories).selected.every((entry) => !entry.cluster.articleIds.includes("mock-high-score")));
  for (const section of ["top_5", "vietnam", "credit", "finland", "markets", "politics", "emerging_frontier", "vc_pe", "world", "worth_reading"] as const) assert.ok(selectSectionFeed(stories, section).every((story) => !story.articleIds.includes("mock-high-score")));
  assert.equal(selectTopFive(stories).selected.some((entry) => entry.cluster.articleIds.includes("live-weak")), false);
});
