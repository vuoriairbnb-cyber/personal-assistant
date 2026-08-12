import assert from "node:assert/strict";
import test from "node:test";
import { hashRateLimitSubject, RateLimitUnavailableError, SupabaseRateLimiter } from "./supabase.ts";

test("Supabase limiter accepts the real one-row PostgreSQL RPC response", async () => {
  let receivedHash = "";
  const limiter = new SupabaseRateLimiter(async (hash) => { receivedHash = hash; return { data: [{ allowed: true, retry_after_seconds: 0 }], error: null }; });
  assert.deepEqual(await limiter.check("358504686644"), { allowed: true, retryAfterSeconds: 0 });
  assert.equal(receivedHash, hashRateLimitSubject("358504686644"));
  assert.ok(!receivedHash.includes("358504686644"));
  assert.notEqual(hashRateLimitSubject("one"), hashRateLimitSubject("two"));
});

test("Supabase limiter returns a denied decision from the real RPC response", async () => {
  const limiter = new SupabaseRateLimiter(async () => ({ data: [{ allowed: false, retry_after_seconds: 42 }], error: null }));
  assert.deepEqual(await limiter.check("user"), { allowed: false, retryAfterSeconds: 42 });
});

test("empty and malformed Supabase responses fail closed", async () => {
  const empty = new SupabaseRateLimiter(async () => ({ data: [], error: null }));
  const malformed = new SupabaseRateLimiter(async () => ({ data: [{ allowed: true, retry_after_seconds: -1 }], error: null }));
  await assert.rejects(() => empty.check("user"), RateLimitUnavailableError);
  await assert.rejects(() => malformed.check("user"), RateLimitUnavailableError);
});

test("Supabase RPC errors fail closed", async () => {
  const limiter = new SupabaseRateLimiter(async () => ({ data: null, error: { message: "RPC unavailable" } }));
  await assert.rejects(() => limiter.check("user"), RateLimitUnavailableError);
});
