import assert from "node:assert/strict";
import test from "node:test";
import { INITIAL_PORTFOLIO_LENSES } from "./portfolio-lenses.ts";
import { isMorningBriefCategory, isMorningBriefContentType, isMorningBriefFeedbackType, isMorningBriefSection } from "./taxonomy.ts";

test("Morning Brief controlled taxonomy accepts supported values and rejects unknown strings", () => {
  assert.equal(isMorningBriefCategory("vietnam"), true);
  assert.equal(isMorningBriefSection("top_5"), true);
  assert.equal(isMorningBriefContentType("analysis"), true);
  assert.equal(isMorningBriefFeedbackType("show_fewer_like_this"), true);
  assert.equal(isMorningBriefCategory("unknown_category"), false);
  assert.equal(isMorningBriefSection("top5"), false);
});

test("initial portfolio lenses are configuration, not inferred holdings", () => {
  assert.deepEqual(INITIAL_PORTFOLIO_LENSES.map((lens) => lens.slug), ["pyn-elite", "evli-emerging-frontier", "european-high-yield", "nordic-high-yield", "evli-nordic-secured-loan"]);
  assert.ok(INITIAL_PORTFOLIO_LENSES.every((lens) => lens.exposures.length > 0 && lens.exposures.every((exposure) => exposure.relevanceStrength === 90)));
});
