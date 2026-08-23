import assert from "node:assert/strict";
import test from "node:test";
import { createAgentToken, createPairingCode, sha256, validateKideWatchInput } from "./control-plane.ts";

const event = "f9a1fe04-b1f8-42ae-8970-c820527e4e66";
test("validates exact and first-under-price watch configurations", () => {
  const exact = validateKideWatchInput({ event, targetMode: "exact_variant", exactVariantName: "Jäsen", saleStartAt: "2026-08-24T12:00:00.000Z", timeoutMinutes: 10 }); assert.equal(exact.exactVariantName, "Jäsen"); assert.equal(exact.maxPriceCents, null);
  const price = validateKideWatchInput({ event, targetMode: "first_available_under_price", maxPrice: "15.00", saleStartAt: "2026-08-24T12:00:00.000Z", timeoutMinutes: 10 }); assert.equal(price.maxPriceCents, 1500); assert.equal(Date.parse(price.expiresAt) - Date.parse(price.saleStartAt), 600_000);
});
test("rejects missing target data, non-one quantities by omission, and invalid timeout", () => {
  assert.throws(() => validateKideWatchInput({ event, targetMode: "exact_variant", saleStartAt: "2026-08-24T12:00:00.000Z", timeoutMinutes: 10 })); assert.throws(() => validateKideWatchInput({ event, targetMode: "first_available_under_price", saleStartAt: "2026-08-24T12:00:00.000Z", timeoutMinutes: 10 })); assert.throws(() => validateKideWatchInput({ event, targetMode: "exact_variant", exactVariantName: "Jäsen", saleStartAt: "2026-08-24T12:00:00.000Z", timeoutMinutes: 0 }));
});
test("pairing and agent credentials are random opaque values represented server-side by hashes", () => {
  const code = createPairingCode(); const token = createAgentToken(); assert.match(code, /^KIDE-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}$/); assert.ok(token.length >= 40); assert.notEqual(sha256(token), token);
});
