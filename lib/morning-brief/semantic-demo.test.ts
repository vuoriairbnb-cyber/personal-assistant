import assert from "node:assert/strict";
import test from "node:test";
import { morningBriefSemanticDemo } from "./semantic-demo";

test("semantic demo gives Nordic covenant coverage a modest boost without creating extreme jumps", () => { const rows = morningBriefSemanticDemo(); const nordic = rows.find((row) => row.candidate.includes("direct lending"))!; const celebrity = rows.find((row) => row.candidate.includes("Celebrity"))!; assert.ok(nordic.likedSimilarity > celebrity.likedSimilarity); assert.ok(Math.abs(nordic.newFinalScore - nordic.oldFinalScore) < 3); });
