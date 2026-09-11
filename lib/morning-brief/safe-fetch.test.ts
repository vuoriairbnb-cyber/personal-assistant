import assert from "node:assert/strict";
import test from "node:test";
import { resolveSafeRedirectShape } from "./import-url";

test("redirect shapes are validated before following", () => { assert.equal(resolveSafeRedirectShape("https://example.com/a", "/b"), "https://example.com/b"); assert.throws(() => resolveSafeRedirectShape("https://example.com/a", "http://127.0.0.1/admin")); assert.throws(() => resolveSafeRedirectShape("https://example.com/a", "http://169.254.169.254/latest")); });
