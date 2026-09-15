import assert from "node:assert/strict";
import test from "node:test";
import { presentMorningBriefHeader } from "./presentation";

test("current Morning Brief header uses the persisted brief date and generation time", () => {
  const present = presentMorningBriefHeader({ date: "2026-09-15", generatedAt: "2026-09-15T07:14:00.000Z" });
  assert.equal(present.date, "Tuesday, 15 September 2026");
  assert.match(present.updated ?? "", /^Brief updated \d{2}:\d{2}$/);
});

test("historical and absent Morning Brief states remain explicit", () => {
  assert.equal(presentMorningBriefHeader({ date: "2026-09-08", generatedAt: "2026-09-08T05:00:00.000Z" }).date, "Tuesday, 8 September 2026");
  assert.deepEqual(presentMorningBriefHeader(null), { date: "No current brief", updated: null });
});
