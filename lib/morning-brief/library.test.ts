import assert from "node:assert/strict";
import test from "node:test";
import { importedArticleIds, importedArticleIdsForUser } from "./library";

test("Imported library contains completed linked imports once and excludes failed work", () => assert.deepEqual(importedArticleIds([{ status: "completed", linkedArticleId: "a" }, { status: "failed", linkedArticleId: "b" }, { status: "completed", linkedArticleId: "a" }, { status: "processing", linkedArticleId: null }]), ["a"]));
test("Imported library remains user scoped", () => assert.deepEqual(importedArticleIdsForUser([{ userId: "a", status: "completed", linkedArticleId: "one" }, { userId: "b", status: "completed", linkedArticleId: "two" }], "a"), ["one"]));
