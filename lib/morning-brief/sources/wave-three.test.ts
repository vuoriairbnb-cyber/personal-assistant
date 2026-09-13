import assert from "node:assert/strict";
import test from "node:test";
import { isRelevantBisCandidate } from "./bis";
import { isRelevantDgEcfinCandidate } from "./dg-ecfin";
import { isRelevantFinanceMinistryCandidate } from "./finance-ministry";
import { isRelevantEconomicAffairsFinlandCandidate } from "./economic-affairs-finland";
import { parseOfficialNewsIndex } from "./official-index";
import { isRelevantNorgesBankCandidate } from "./norges-bank";
import { isRelevantRiksbankCandidate } from "./riksbank";
import { isRelevantStatisticsFinlandCandidate } from "./statistics-finland";
import { isRelevantVietnamGovernmentCandidate } from "./vietnam-government";

const base = { sourceArticleId: "item", canonicalUrl: "https://example.test/item", excerpt: "", publishedAt: "2026-09-12T10:00:00.000Z", categories: [], language: "en", rawMetadata: {} };
const parseFixture = `<article><a href="/release/cpi">Consumer prices increased in August</a><time>11/09/2026</time></article><article><a href="/release/gdp">Gross domestic product grew in the second quarter</a><time>2026-09-10</time></article><article><a href="/about">About this institution</a><time>09/09/2026</time></article>`;

test("official index parser accepts only dated local article links with canonical URLs and a bound", () => {
  const items = parseOfficialNewsIndex(parseFixture, { sourceSlug: "fixture", indexUrl: "https://official.example/news", language: "en", maxItems: 1, hosts: ["official.example"] });
  assert.equal(items.length, 1); assert.equal(items[0]!.canonicalUrl, "https://official.example/release/cpi"); assert.equal(items[0]!.publishedAt, "2026-09-11T12:00:00.000Z");
  assert.deepEqual(parseOfficialNewsIndex("<a href=\"https://foreign.example/item\">GDP release</a> 11/09/2026", { sourceSlug: "fixture", indexUrl: "https://official.example/news", language: "en", maxItems: 5, hosts: ["official.example"] }), []);
  assert.deepEqual(parseOfficialNewsIndex("not a source response", { sourceSlug: "fixture", indexUrl: "https://official.example/news", language: "en", maxItems: 5, hosts: ["official.example"] }), []);
});

test("Wave 3 filters retain material macro and policy releases while rejecting routine noise", () => {
  assert.equal(isRelevantStatisticsFinlandCandidate({ ...base, sourceSlug: "statistics-finland", title: "Consumer price index rose in August" }), true);
  assert.equal(isRelevantStatisticsFinlandCandidate({ ...base, sourceSlug: "statistics-finland", title: "GDP grew in the second quarter" }), true);
  assert.equal(isRelevantStatisticsFinlandCandidate({ ...base, sourceSlug: "statistics-finland", title: "Labour force unemployment rate" }), true);
  assert.equal(isRelevantStatisticsFinlandCandidate({ ...base, sourceSlug: "statistics-finland", title: "Staff appointment" }), false);
  assert.equal(isRelevantFinanceMinistryCandidate({ ...base, sourceSlug: "finance-ministry-finland", title: "Government agrees major fiscal package" }), true);
  assert.equal(isRelevantFinanceMinistryCandidate({ ...base, sourceSlug: "finance-ministry-finland", title: "Ministry hosts a ceremonial event" }), false);
  assert.equal(isRelevantEconomicAffairsFinlandCandidate({ ...base, sourceSlug: "economic-affairs-finland", title: "Major industrial investment supports growth" }), true);
  assert.equal(isRelevantEconomicAffairsFinlandCandidate({ ...base, sourceSlug: "economic-affairs-finland", title: "Staff appointment" }), false);
  assert.equal(isRelevantRiksbankCandidate({ ...base, sourceSlug: "riksbank", title: "Monetary policy decision and policy rate" }), true);
  assert.equal(isRelevantRiksbankCandidate({ ...base, sourceSlug: "riksbank", title: "Financial stability report" }), true);
  assert.equal(isRelevantRiksbankCandidate({ ...base, sourceSlug: "riksbank", title: "New office opening" }), false);
  assert.equal(isRelevantNorgesBankCandidate({ ...base, sourceSlug: "norges-bank", title: "Policy rate kept unchanged" }), true);
  assert.equal(isRelevantNorgesBankCandidate({ ...base, sourceSlug: "norges-bank", title: "Financial stability report" }), true);
  assert.equal(isRelevantNorgesBankCandidate({ ...base, sourceSlug: "norges-bank", title: "Staff seminar" }), false);
  assert.equal(isRelevantVietnamGovernmentCandidate({ ...base, sourceSlug: "vietnam-government", title: "Vietnam approves public investment infrastructure programme" }), true);
  assert.equal(isRelevantVietnamGovernmentCandidate({ ...base, sourceSlug: "vietnam-government", title: "Ceremony celebrates national holiday" }), false);
  assert.equal(isRelevantBisCandidate({ ...base, sourceSlug: "bis", title: "Foreign currency funding risk and cross-border liquidity" }), true);
  assert.equal(isRelevantBisCandidate({ ...base, sourceSlug: "bis", title: "Conference welcome remarks" }), false);
  assert.equal(isRelevantDgEcfinCandidate({ ...base, sourceSlug: "dg-ecfin", title: "Spring Economic Forecast shows slower growth and higher inflation" }), true);
  assert.equal(isRelevantDgEcfinCandidate({ ...base, sourceSlug: "dg-ecfin", title: "Registrations open for Brussels conference" }), false);
});
