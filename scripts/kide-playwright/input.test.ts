import assert from "node:assert/strict";
import test from "node:test";
import { parseKideBrowserPocArgs } from "./input.ts";

const eventId = "5e0d8170-9307-4cbb-8de2-acad8a414eec";
test("parses a Kide event URL and exact variant CLI input", () => { const value = parseKideBrowserPocArgs(["--event", `https://kide.app/events/${eventId}`, "--variant", "Jäsen"]); assert.equal(value.eventId, eventId); assert.equal(value.variantName, "Jäsen"); assert.equal(value.eventUrl, `https://kide.app/events/${eventId}`); });
test("rejects missing, duplicate, and unknown CLI arguments", () => { assert.throws(() => parseKideBrowserPocArgs(["--event", eventId])); assert.throws(() => parseKideBrowserPocArgs(["--event", eventId, "--event", eventId, "--variant", "Jäsen"])); assert.throws(() => parseKideBrowserPocArgs(["--unknown", "x", "--variant", "Jäsen"])); });
