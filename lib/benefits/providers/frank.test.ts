import assert from "node:assert/strict";
import test from "node:test";
import { fetchFrankBenefits, frankRedemption, normalizeFrankLocations, normalizeFrankOffer } from "./frank.ts";

const hotels = { key: "offer_5980", slug: "hotels-com", advertiser: "Hotels.com", shownToStudents: true, shownToAlumni: true, shortDescription: "Syysale jopa -30 %", description: "<p>Matkailu ja <strong>majoitus</strong>.</p><script>unsafe()</script>", url: "https://student.frank.fi/offers/hotels", branchLink: "https://frank.app.link/offer_5980", hasDiscountCode: true, singleUse: false, offerType: 1, discountType: "GLOBAL_DISCOUNT", primaryCategory: 4, categories: [4, 35], validUntil: "2026-09-30T23:59:59", locations: [] };
const cocopanda = { key: "offer_5600", slug: "cocopanda", advertiser: "Cocopanda", shownToStudents: true, shownToAlumni: false, shortDescription: "-20 % kosmetiikkasuosikeista", description: "Kosmetiikka", url: "https://student.frank.fi/offers/cocopanda", hasDiscountCode: false, singleUse: false, offerType: 2, primaryCategory: 9, categories: [9, 106], locations: [{ name: "Keskusta", city: "Helsinki" }] };

test("reads { data, meta }, paginates by totalPages, and deduplicates by key", async () => {
  const calls: string[] = []; const fetcher = async (input: string | URL) => { const url = new URL(String(input)); calls.push(url.toString()); const page = url.searchParams.get("page"); return new Response(JSON.stringify(page === "1" ? { data: [hotels, cocopanda], meta: { pagination: { totalPages: 2 } } } : { data: [hotels], meta: { pagination: { totalPages: 2 } } }), { status: 200 }); };
  const benefits = await fetchFrankBenefits(fetcher as typeof fetch);
  assert.equal(calls.length, 2); assert.equal(new URL(calls[0]!).searchParams.get("includeJobs"), "false"); assert.equal(benefits.length, 2); assert.match(benefits.find((benefit) => benefit.externalId === "offer_5980")?.description ?? "", /Matkailu ja majoitus/); assert.doesNotMatch(benefits.find((benefit) => benefit.externalId === "offer_5980")?.description ?? "", /unsafe/);
});

test("normalizes locations, stable keys, audience and expiry", () => {
  assert.deepEqual(normalizeFrankLocations([{ city: "Helsinki", name: "Keskusta" }, "Turku", { cityName: "Jyväskylä", streetAddress: "Vapaaherrantie 11" }, { city: "Helsinki" }]), ["Keskusta", "Helsinki", "Turku", "Jyväskylä", "Vapaaherrantie 11"]);
  assert.equal(normalizeFrankOffer({ ...cocopanda, key: undefined })?.externalId, "cocopanda");
  assert.equal(normalizeFrankOffer({ ...cocopanda, shownToStudents: false }), null);
  assert.equal(normalizeFrankOffer({ ...cocopanda, validUntil: "2020-01-01" })?.validUntil, "2020-01-01T00:00:00.000Z");
});

test("routes discount-code, single-use, branch link, and URL offers through Frank", () => {
  assert.deepEqual(frankRedemption(hotels), { type: "provider_app", url: "https://frank.app.link/offer_5980", notice: "Alennuskoodi saatavilla Frankin kautta." });
  assert.equal(frankRedemption({ ...cocopanda, singleUse: true }).notice, "Kertaetu lunastetaan Frankissa.");
  assert.deepEqual(frankRedemption({ ...cocopanda, branchLink: "https://frank.app.link/offer_5600" }), { type: "provider_app", url: "https://frank.app.link/offer_5600", notice: null });
  assert.deepEqual(frankRedemption(cocopanda), { type: "provider_link", url: "https://student.frank.fi/offers/cocopanda", notice: null });
});

test("provider failures propagate for aggregation isolation", async () => {
  await assert.rejects(() => fetchFrankBenefits(async () => new Response("unavailable", { status: 503 }) as Response));
});
