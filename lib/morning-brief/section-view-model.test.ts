import assert from "node:assert/strict";
import test from "node:test";
import type { MorningBriefStory } from "@/components/morning-brief/mock-data";
import { groupMorningBriefStories } from "./section-view-model";

const story = (id: string, category: string): MorningBriefStory => ({
  id, title: "Serializable story", source: "Yle", sourceUrl: "https://yle.fi/example", publishedLabel: "1h",
  estimatedReadTime: "2 min read", summary: "Summary", category, tags: ["news"], imageUrl: null,
  imageTone: "sand", imageLabel: "News", relatedCoverage: [],
});

function assertPlainData(value: unknown): void {
  if (value === null || ["string", "number", "boolean"].includes(typeof value)) return;
  if (Array.isArray(value)) { for (const item of value) assertPlainData(item); return; }
  assert.equal(typeof value, "object");
  assert.equal(Object.getPrototypeOf(value), Object.prototype);
  for (const nested of Object.values(value as Record<string, unknown>)) assertPlainData(nested);
}

test("persisted section view model has a normal prototype and plain nested story data", () => {
  const result = groupMorningBriefStories([story("one", "top_5"), story("two", "vietnam")]);
  assert.equal(Object.getPrototypeOf(result), Object.prototype);
  assert.deepEqual(Object.keys(result), ["top_5", "vietnam"]);
  assertPlainData(result);
});
