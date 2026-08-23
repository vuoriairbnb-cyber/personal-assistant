import assert from "node:assert/strict";
import test from "node:test";
import { normalizeKideEvent } from "./normalize.ts";

function fixture(variants: unknown[], product: Record<string, unknown> = {}) {
  return { model: { product: { id: "event-1", name: "Test event", salesStarted: true, salesOngoing: true, salesEnded: false, salesPaused: false, availability: 1, ...product }, variants, categories: [] } };
}
function variant(overrides: Record<string, unknown> = {}) {
  return { id: "variant-1", name: "Regular", inventoryId: "inventory-1", currencyCode: "EUR", pricePerItem: 1000, availability: 4, salesStarted: true, salesEnded: false, salesOngoing: true, ...overrides };
}

test("normalizes expected pre-sale events with no variants", () => {
  const event = normalizeKideEvent(fixture([], { salesStarted: false, salesOngoing: false, availability: 0, dateSalesFrom: "2026-08-24T12:00:00Z", timeUntilSalesStart: 3600 }));
  assert.equal(event.salesStarted, false); assert.equal(event.variants.length, 0); assert.equal(event.timeUntilSalesStart, 3600);
});

test("normalizes available, sold-out, and mixed ticket variants without treating availability as an exact count", () => {
  const event = normalizeKideEvent(fixture([variant(), variant({ id: "variant-2", name: "Sold out", availability: 0 })]));
  assert.deepEqual(event.variants.map((item) => ({ name: item.name, availability: item.availability })), [{ name: "Regular", availability: 4 }, { name: "Sold out", availability: 0 }]);
});

test("normalizes restrictions and free variants defensively", () => {
  const event = normalizeKideEvent(fixture([
    variant({ isProductVariantMembershipRequired: true, isProductVariantHakaAuthenticationRequired: true, accessControlMembershipIds: ["membership-a", "membership-b"] }),
    variant({ id: "variant-free", name: "Free", pricePerItem: 0, currencyCode: null, isProductVariantStudentCardRequired: true }),
  ]));
  assert.deepEqual(event.variants[0]!.accessControlMembershipIds, ["membership-a", "membership-b"]);
  assert.equal(event.variants[0]!.membershipRequired, true); assert.equal(event.variants[0]!.hakaRequired, true);
  assert.equal(event.variants[1]!.pricePerItem, 0); assert.equal(event.variants[1]!.currencyCode, null); assert.equal(event.variants[1]!.studentCardRequired, true);
});

test("missing optional upstream fields do not crash normalization", () => {
  const event = normalizeKideEvent({ model: { product: { id: "event-2", name: "Minimal" }, variants: [{}] } });
  assert.deepEqual(event.variants, []); assert.equal(event.dateSalesFrom, null); assert.equal(event.hasReservations, null);
});
