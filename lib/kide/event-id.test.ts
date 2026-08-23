import assert from "node:assert/strict";
import test from "node:test";
import { parseKideEventId } from "./event-id.ts";
import { KideError } from "./types.ts";

const id = "5e0d8170-9307-4cbb-8de2-acad8a414eec";

test("Kide event ID parser accepts a Kide URL and raw UUID", () => {
  assert.equal(parseKideEventId(`https://kide.app/events/${id}`), id);
  assert.equal(parseKideEventId(id.toUpperCase()), id);
});

test("Kide event ID parser rejects unrelated, malformed, and empty input", () => {
  assert.throws(() => parseKideEventId(`https://example.test/events/${id}`), KideError);
  assert.throws(() => parseKideEventId("https://kide.app/events/not-a-uuid"), KideError);
  assert.throws(() => parseKideEventId(""), KideError);
});
