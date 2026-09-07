import assert from "node:assert/strict";
import test from "node:test";
import { htmlToPlainText } from "./html.ts";
import { classifyMemberPlusRedemption, normalizeMemberPlusBenefit } from "./providers/memberplus.ts";
import { rankBenefits } from "./search.ts";
import type { NormalizedBenefit } from "./types.ts";

const unions = new Map([["66", "ASIA"], ["60", "Agronomiliitto"]]);
const base = (overrides: Partial<NormalizedBenefit>): NormalizedBenefit => ({ provider: "memberplus", externalId: "x", title: "Example", heading: null, description: "", providerCategory: null, normalizedCategory: null, offerer: null, locations: [], restrictions: null, benefitText: null, redemptionType: "unknown", redemptionCode: null, redemptionUrl: null, sourceUrl: null, imageUrl: null, validFrom: null, validUntil: null, unionId: null, unionName: null, isGeneralBenefit: true, isRecommended: false, providerMetadata: null, searchText: "", ...overrides } as NormalizedBenefit);

test("normalizes general and union-specific Member+ benefits with taxonomy mapping", () => {
  const autodude = normalizeMemberPlusBenefit({ wpId: 11365, title: "Autodude", heading: "-10%", content: "<p>Auto-osia</p>", extendedProperties: [{ key: "categories", value: "koti-ja-arki" }] }, unions);
  const st1 = normalizeMemberPlusBenefit({ wpId: 9877, title: "St1-etu", extendedProperties: [{ key: "union", value: "66" }, { key: "compatible_0_compatible_item", value: "99" }] }, unions);
  assert.equal(autodude?.isGeneralBenefit, true); assert.equal(autodude?.providerCategory, "koti-ja-arki"); assert.equal(st1?.unionId, "66"); assert.equal(st1?.unionName, "ASIA");
});

test("normalizes sentinel dates and safely converts remote HTML", () => { const benefit = normalizeMemberPlusBenefit({ wpId: 10188, title: "24Rent", content: "<script>bad()</script><p>20% &amp; enemmän</p>", itemEndDate: "0001-01-01T00:00:00" }, unions); assert.equal(benefit?.validUntil, null); assert.equal(htmlToPlainText("<b>Hei</b><script>x</script> &amp; tervetuloa"), "Hei & tervetuloa"); });

test("classifies code, instructions, and link redemption", () => {
  assert.deepEqual(classifyMemberPlusRedemption("Etukoodi: memberkuohu25", null), { type: "code", code: "memberkuohu25", url: null });
  assert.equal(classifyMemberPlusRedemption("Näytä jäsenkortti kassalla", null).type, "instructions");
  assert.equal(classifyMemberPlusRedemption(null, "https://example.test/offer").type, "link");
});

test("ranking favors word-start title matches and hides inaccessible union benefits", () => {
  const autodude = base({ externalId: "11365", title: "Autodude", heading: "Auto-osat jäsenhintaan", description: "" });
  const irrelevant = base({ externalId: "bad", title: "Meri-Ruukin lomakylä", description: "Rinneautoilu kuuluu ohjelmaan" });
  const unionOnly = base({ externalId: "9877", title: "St1-etu", unionId: "66", unionName: "ASIA", isGeneralBenefit: false });
  assert.deepEqual(rankBenefits([irrelevant, autodude, unionOnly], "autonhuolto", { memberPlusUnionId: null, memberPlusUnionName: null }).map((benefit) => benefit.externalId), ["11365"]);
  assert.equal(rankBenefits([unionOnly], "st1", { memberPlusUnionId: null, memberPlusUnionName: null }).length, 0);
  assert.equal(rankBenefits([unionOnly], "st1", { memberPlusUnionId: "66", memberPlusUnionName: "ASIA" }).length, 1);
});

test("Member+ API failures are propagated to the aggregation layer without malformed results", async () => {
  await assert.rejects(() => import("./providers/memberplus.ts").then(({ fetchMemberPlusBenefits }) => fetchMemberPlusBenefits(async () => new Response("no", { status: 503 }))));
});
