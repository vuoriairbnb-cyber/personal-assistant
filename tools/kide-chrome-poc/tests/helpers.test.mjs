import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

async function helpers() {
  const source = await readFile(new URL("../helpers.js", import.meta.url), "utf8");
  const sandbox = { URL }; sandbox.globalThis = sandbox; vm.runInNewContext(source, sandbox);
  return sandbox.KideChromePoc;
}

test("parses a Kide UUID or event URL and rejects unrelated input", async () => {
  const poc = await helpers(); const id = "359b2e27-e383-4d64-b4f7-c461c75cffa8";
  assert.equal(poc.parseEventInput(id).eventId, id); assert.equal(poc.parseEventInput(`https://kide.app/events/${id}`).eventUrl, `https://kide.app/events/${id}`); assert.equal(poc.parseEventInput("https://example.test/events/359b2e27-e383-4d64-b4f7-c461c75cffa8"), null);
});

test("matches exact normalized variant text without matching a longer name", async () => {
  const poc = await helpers(); assert.equal(poc.exactVariantMatch("  Jäsen\n", "Jäsen"), true); assert.equal(poc.exactVariantMatch("Ei-jäsen", "Jäsen"), false); assert.equal(poc.exactVariantMatch("Jäsen + haalarimerkki", "Jäsen"), false);
});

test("detects challenge and verification text conservatively", async () => {
  const poc = await helpers(); assert.equal(poc.pageHasChallenge("Cloudflare Verification failed"), true); assert.equal(poc.pageHasChallenge("Verify you are human"), true); assert.equal(poc.pageHasChallenge("Normal Kide event page"), false);
});

test("recognizes the local O-ITEM reservation control but never the membership chip", async () => {
  const poc = await helpers();
  assert.equal(poc.isKideReservationControl("O-ITEM", "product.onCreateEditOrCancelReservation($event, variant)", null), true);
  assert.equal(poc.isKideReservationControl("O-CHIP", "product.onProductRequiresMembershipClick($event, variant)", null), false);
  assert.equal(poc.isKideReservationControl("O-ITEM", "product.onProductRequiresMembershipClick($event, variant)", null), false);
});

test("allows a real reservation click only from the ready state", async () => {
  const poc = await helpers(); assert.equal(poc.canCreateReservation("READY"), true); assert.equal(poc.canCreateReservation("FOUND"), false); assert.equal(poc.canCreateReservation("VERIFICATION_REQUIRED"), false);
});

test("parses local sale time and calculates a bounded watch expiry", async () => {
  const poc = await helpers(); const saleStart = poc.parseLocalSaleStart("2026-08-24T12:00");
  assert.ok(saleStart); assert.equal(poc.calculateWatchExpiry(saleStart, 10) - saleStart, 600_000); assert.equal(poc.parseLocalSaleStart("2026-99-99T12:00"), null);
});

test("maps automatic watch states without allowing a second attempt", async () => {
  const poc = await helpers(); const now = 1_000_000; const base = { armed: true, saleStart: now + 1_000, expiresAt: now + 10_000, reservationAttempted: false };
  assert.equal(poc.autoWatchState(base, now, false, false), "WAITING_FOR_SALE"); assert.equal(poc.autoWatchState({ ...base, saleStart: now - 1 }, now, false, false), "WAITING_FOR_VARIANT"); assert.equal(poc.autoWatchState({ ...base, saleStart: now - 1 }, now, false, true), "READY_TO_ATTEMPT"); assert.equal(poc.autoWatchState({ ...base, saleStart: now - 1, reservationAttempted: true }, now, false, true), "RESERVATION_RESULT_UNKNOWN"); assert.equal(poc.autoWatchState({ ...base, expiresAt: now }, now, false, true), "WATCH_EXPIRED"); assert.equal(poc.autoWatchState(base, now, true, false), "VERIFICATION_REQUIRED");
});
