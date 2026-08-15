import assert from "node:assert/strict";
import test from "node:test";
import { bypassesUserSession } from "./machine-endpoints.ts";

test("only explicitly authenticated machine endpoints bypass user sessions", () => {
  assert.equal(bypassesUserSession("/api/elevenlabs/golf-search"), true);
  assert.equal(bypassesUserSession("/api/cron/golf-watches"), true);
  assert.equal(bypassesUserSession("/api/cron/golf-watches/"), false);
  assert.equal(bypassesUserSession("/api/elevenlabs/golf-search/"), false);
  assert.equal(bypassesUserSession("/api/elevenlabs/conversations"), false);
  assert.equal(bypassesUserSession("/api/golf"), false);
  assert.equal(bypassesUserSession("/dashboard"), false);
});
