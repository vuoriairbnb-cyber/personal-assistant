import assert from "node:assert/strict";
import test from "node:test";
import { dispatchClaimedNotifications } from "./delivery.ts";
import type { NotificationEvent, NotificationSender } from "./types.ts";

const playerEvent = { id: "match-event", eventType: "player_watch_match", sourceType: "player_watch_match", sourceId: "match-1", payload: { player_name: "Elo Vartiainen", course: "Helsingin Golfklubi", date: "2026-08-22", time: "14:51" }, deliveryAttempts: 0 };

test("a pending player watch match is sent once and marked processed", async () => {
  const sent: NotificationEvent[] = []; const processed: string[] = [];
  const summary = await dispatchClaimedNotifications([playerEvent], { send: async (event) => { sent.push(event); return { ok: true, externalId: "123" }; } }, { markProcessed: async (event) => { processed.push(event.id); }, markFailed: async () => assert.fail("must not fail") }, { info() {}, error() {} });
  assert.deepEqual(summary, { attempted: 1, sent: 1, failed: 0 }); assert.equal(sent.length, 1); assert.deepEqual(processed, ["match-event"]);
});

test("Telegram failure leaves a player match retryable and does not affect later unique matches", async () => {
  const retryable: string[] = []; const sender: NotificationSender = { send: async () => { throw new Error("down"); } };
  const summary = await dispatchClaimedNotifications([playerEvent], sender, { markProcessed: async () => assert.fail("must not process"), markFailed: async (event, status) => { assert.equal(status, "pending"); retryable.push(event.id); } }, { info() {}, error() {} });
  assert.deepEqual(summary, { attempted: 1, sent: 0, failed: 1 }); assert.deepEqual(retryable, ["match-event"]);
  assert.notEqual({ ...playerEvent, id: "different-tee-time", sourceId: "match-2" }.sourceId, playerEvent.sourceId);
});
