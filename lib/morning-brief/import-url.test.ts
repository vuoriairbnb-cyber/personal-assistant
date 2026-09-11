import assert from "node:assert/strict";
import test from "node:test";
import { assertSafeUrlShape, isPrivateAddress, normalizeImportUrl } from "./import-url";

test("normalizes URLs and removes tracking without losing functional query values", () => {
  assert.equal(normalizeImportUrl(" HTTPS://Example.COM/story?utm_source=x&b=2&a=1&a=0#part "), "https://example.com/story?a=0&a=1&b=2");
});
test("rejects unsafe URL shapes and credentials", () => {
  for (const url of ["file:///etc/passwd", "http://localhost/a", "http://127.0.0.1/a", "http://user:pass@example.com/a", "http://169.254.169.254/latest"]) assert.throws(() => assertSafeUrlShape(url));
  assert.equal(assertSafeUrlShape("https://news.example.org/story"), "https://news.example.org/story");
});
test("recognizes private resolved addresses", () => {
  for (const address of ["10.1.2.3", "172.16.0.1", "192.168.1.1", "::1", "fd00::1", "::ffff:127.0.0.1"]) assert.equal(isPrivateAddress(address), true);
  assert.equal(isPrivateAddress("1.1.1.1"), false);
});
