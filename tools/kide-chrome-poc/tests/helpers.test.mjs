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

test("parses visible Kide euro prices into integer cents without guessing", async () => {
  const poc = await helpers(); assert.equal(poc.extractVisiblePriceCents("Jäsen 4,00 € For members"), 400); assert.equal(poc.extractVisiblePriceCents("15.00 €"), 1500); assert.equal(poc.extractVisiblePriceCents("25 €"), 2500); assert.equal(poc.extractVisiblePriceCents("Price TBA"), null);
});

test("validates per-watch maximum price cents", async () => {
  const poc = await helpers(); assert.equal(poc.parseEuroCents("15.00"), 1500); assert.equal(poc.parseEuroCents("-1"), null); assert.equal(poc.parseEuroCents("Infinity"), null);
});

test("first eligible visible candidate under the configured maximum wins", async () => {
  const poc = await helpers(); const max = 1500; const candidates = [{ actionable: false, priceCents: 500 }, { actionable: true, priceCents: 2000 }, { actionable: true, priceCents: null }, { actionable: true, priceCents: 1000 }, { actionable: true, priceCents: 500 }];
  assert.equal(candidates.find((candidate) => poc.isEligibleUnderMaxPrice(candidate, max)).priceCents, 1000); assert.equal(poc.isEligibleUnderMaxPrice({ actionable: true, priceCents: 2000 }, max), false); assert.equal(poc.isEligibleUnderMaxPrice({ actionable: false, priceCents: 1000 }, max), false); assert.equal(poc.isEligibleUnderMaxPrice({ actionable: true, priceCents: null }, max), false);
});

test("prepares first-under-price mode without an exact variant name", async () => {
  const poc = await helpers(); const result = poc.validateAutoWatchConfig({ eventInput: "f9a1fe04-b1f8-42ae-8970-c820527e4e66", targetMode: "first_available_under_price", exactVariantName: "", maxPriceInput: "10.00", startWatchingNow: true, saleStartInput: "", timeoutInput: "2", now: 1_000_000 });
  assert.equal(result.ok, true); assert.equal(result.value.exactVariantName, null); assert.equal(result.value.maxPriceCents, 1000);
});

test("validates the active auto target mode with specific messages", async () => {
  const poc = await helpers(); const base = { eventInput: "f9a1fe04-b1f8-42ae-8970-c820527e4e66", saleStartInput: "", startWatchingNow: true, timeoutInput: "2", now: 1_000_000 };
  assert.equal(poc.validateAutoWatchConfig({ ...base, targetMode: "exact_variant", exactVariantName: "", maxPriceInput: "" }).error, "Enter an exact variant name."); assert.equal(poc.validateAutoWatchConfig({ ...base, targetMode: "first_available_under_price", exactVariantName: "", maxPriceInput: "" }).error, "Enter a valid maximum price."); assert.equal(poc.validateAutoWatchConfig({ ...base, eventInput: "bad", targetMode: "first_available_under_price", exactVariantName: "", maxPriceInput: "10" }).error, "Enter a valid Kide event ID or URL."); assert.equal(poc.validateAutoWatchConfig({ ...base, targetMode: "first_available_under_price", exactVariantName: "", maxPriceInput: "10", startWatchingNow: false, saleStartInput: "" }).error, "Choose a sale start time or Start watching now."); assert.equal(poc.validateAutoWatchConfig({ ...base, targetMode: "first_available_under_price", exactVariantName: "", maxPriceInput: "10", timeoutInput: "0" }).error, "Enter a valid watch timeout.");
});

test("places auto targeting configuration before the prepare button", async () => {
  const popup = await readFile(new URL("../popup.html", import.meta.url), "utf8");
  assert.ok(popup.indexOf('id="auto-event"') < popup.indexOf('id="prepare-auto"')); assert.ok(popup.indexOf('id="auto-target-mode"') < popup.indexOf('id="prepare-auto"')); assert.ok(popup.indexOf('id="max-price"') < popup.indexOf('id="prepare-auto"'));
});
