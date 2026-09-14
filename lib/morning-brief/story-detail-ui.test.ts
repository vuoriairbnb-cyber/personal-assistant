import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

test("Story Detail uses editorial bullets and no longer renders Your exposure", () => {
  const source = readFileSync(join(process.cwd(), "components", "morning-brief", "StoryDetail.tsx"), "utf8");
  assert.equal(source.includes("Your exposure"), false);
  assert.equal(source.includes("list-disc"), true);
  assert.equal(source.includes("normalizeStoryTakeaway"), true);
});
