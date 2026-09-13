import assert from "node:assert/strict";
import test from "node:test";
import { deriveMorningBriefFreshnessClass, isMorningBriefEligible, MORNING_BRIEF_FRESHNESS_POLICY } from "./freshness-policy";
import { calculateFreshness, type RankingArticle } from "./ranking";

const now = new Date("2026-09-13T12:00:00.000Z");
const atHoursAgo = (hours: number) => new Date(now.getTime() - hours * 3_600_000).toISOString();

test("content-aware eligibility uses conservative defaults and bounded long-form windows", () => {
  assert.equal(isMorningBriefEligible(atHoursAgo(47), {}, now), true); assert.equal(isMorningBriefEligible(atHoursAgo(49), {}, now), false);
  assert.equal(isMorningBriefEligible(atHoursAgo(96), { rawMetadata: { source_family: "official_primary_statistics" } }, now), true); assert.equal(isMorningBriefEligible(atHoursAgo(144), { rawMetadata: { source_family: "official_primary_statistics" } }, now), false);
  assert.equal(isMorningBriefEligible(atHoursAgo(20 * 24), { rawMetadata: { pyn_content_type: "monthly_review" } }, now), true); assert.equal(isMorningBriefEligible(atHoursAgo(31 * 24), { rawMetadata: { pyn_content_type: "monthly_review" } }, now), false);
  assert.equal(isMorningBriefEligible(atHoursAgo(10 * 24), { contentType: "long_read" }, now), true); assert.equal(isMorningBriefEligible(atHoursAgo(15 * 24), { contentType: "long_read" }, now), false);
  assert.deepEqual(MORNING_BRIEF_FRESHNESS_POLICY, { standard_news: 48, official_macro_release: 120, portfolio_manager_update: 720, long_form_research: 336 });
});

test("deterministic source hints map PYN and official macro releases without source-specific eligibility branches", () => {
  assert.equal(deriveMorningBriefFreshnessClass({ rawMetadata: { pyn_content_type: "monthly_review" } }), "portfolio_manager_update");
  assert.equal(deriveMorningBriefFreshnessClass({ rawMetadata: { pyn_content_type: "investor_letter" } }), "portfolio_manager_update");
  assert.equal(deriveMorningBriefFreshnessClass({ rawMetadata: { source_family: "official_primary_statistics" } }), "official_macro_release");
  assert.equal(deriveMorningBriefFreshnessClass({ rawMetadata: { freshness_class: "official_macro_release" } }), "official_macro_release");
  assert.equal(deriveMorningBriefFreshnessClass({ rawMetadata: {} }), "standard_news");
});

test("ranking freshness continues to decay inside a longer eligibility window", () => {
  const article = (publishedAt: string): RankingArticle => ({ id: publishedAt, title: "Investor letter", source: "PYN Elite", publishedAt, contentType: "long_read", countries: [], regions: [], categories: [], topics: [], sectors: [], companies: [], significance: 60, consequence: 60, scope: 60, summary: "", primarySection: "vietnam" });
  assert.ok(calculateFreshness(article(atHoursAgo(1)), now) > calculateFreshness(article(atHoursAgo(25 * 24)), now));
});
