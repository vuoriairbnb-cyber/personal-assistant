import assert from "node:assert/strict";
import test from "node:test";
import { createGolfWatchCronHandler } from "./cron-handler.ts";

const watches = { processed: 1, matched: 0, rescheduled: 1, expired: 0, failed: 0 };
const notifications = { attempted: 0, sent: 0, failed: 0 };

test("cron POST rejects missing and wrong Bearer secrets", async () => {
  const handler = createGolfWatchCronHandler({ secret: "correct", processWatches: async () => watches, processNotifications: async () => notifications });
  assert.equal((await handler(new Request("https://example.test", { method: "POST" }))).status, 401);
  assert.equal((await handler(new Request("https://example.test", { method: "POST", headers: { authorization: "Bearer wrong" } }))).status, 401);
});

test("authorized POST calls the watch processor and returns its summary", async () => {
  let watchCalls = 0;
  const handler = createGolfWatchCronHandler({ secret: "correct", processWatches: async () => { watchCalls += 1; return watches; }, processNotifications: async () => notifications, now: (() => { let tick = 0; return () => tick++ * 10; })() });
  const response = await handler(new Request("https://example.test", { method: "POST", headers: { authorization: "Bearer correct" }, body: "{}" }));
  assert.equal(response.status, 200); assert.equal(watchCalls, 1);
  assert.deepEqual(await response.json(), { ok: true, ...watches, notifications, duration_ms: 10 });
});

test("GET remains supported through the same handler", async () => {
  const handler = createGolfWatchCronHandler({ secret: "correct", processWatches: async () => watches, processNotifications: async () => notifications });
  assert.equal((await handler(new Request("https://example.test", { headers: { authorization: "Bearer correct" } }))).status, 200);
});
