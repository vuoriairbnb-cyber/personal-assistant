import assert from "node:assert/strict";
import test from "node:test";
import { findExactVariantName } from "./variant.ts";

test("matches only the exact trimmed target variant name", () => { assert.equal(findExactVariantName(["Basic", " Jäsen ", "Jäsen Plus"], "Jäsen"), " Jäsen "); assert.equal(findExactVariantName(["Basic", "Jäsen Plus"], "Jäsen"), null); });
