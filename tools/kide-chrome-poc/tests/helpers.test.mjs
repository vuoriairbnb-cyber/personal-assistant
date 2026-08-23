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
