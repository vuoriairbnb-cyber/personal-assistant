import assert from "node:assert/strict";
import test from "node:test";
import { hashRateLimitSubject, RateLimitUnavailableError, SupabaseRateLimiter } from "./supabase.ts";

test("Supabase limiter uses a hashed subject and forwards RPC decisions", async () => {
  let receivedHash = "";
  const limiter = new SupabaseRateLimiter(async (hash) => { receivedHash = hash; return { data: [{ allowed: false, retry_after_seconds: 60 }], error: null }; });
  assert.deepEqual(await limiter.check("358504686644"), { allowed: false, retryAfterSeconds: 60 });
  assert.equal(receivedHash, hashRateLimitSubject("358504686644"));
  assert.ok(!receivedHash.includes("358504686644"));
  assert.notEqual(hashRateLimitSubject("one"), hashRateLimitSubject("two"));
});

test("Supabase errors fail closed", async () => {
  const limiter = new SupabaseRateLimiter(async () => ({ data: null, error: { message: "RPC unavailable" } }));
  await assert.rejects(() => limiter.check("user"), RateLimitUnavailableError);
});
