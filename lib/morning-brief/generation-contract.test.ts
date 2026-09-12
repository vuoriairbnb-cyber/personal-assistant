import assert from "node:assert/strict";
import test from "node:test";
import { dailyBriefGenerationRecord } from "./generation-contract";

test("live regeneration explicitly updates generated_at without resetting created_at", () => {
  const generatedAt = "2026-09-12T13:17:03.621Z";
  const record = dailyBriefGenerationRecord("user", "2026-09-12", generatedAt, "live", 2, 1);
  assert.equal(record.generated_at, generatedAt);
  assert.equal("created_at" in record, false);
  assert.equal(record.metadata_json.generation_mode, "live");
  assert.equal(record.metadata_json.development_mock, false);
});

test("development mock generation remains explicitly available", () => {
  const record = dailyBriefGenerationRecord("user", "2026-09-12", "2026-09-12T13:17:03.621Z", "mock", 0, 0);
  assert.equal(record.metadata_json.generation_mode, "mock");
  assert.equal(record.metadata_json.development_mock, true);
});
