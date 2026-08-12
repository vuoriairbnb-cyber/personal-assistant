import { createHash } from "node:crypto";
import type { RateLimiter, RateLimitResult } from "./types.ts";

export type RateLimitRpc = (userHash: string) => Promise<{ data: unknown; error: unknown }>;
export class RateLimitUnavailableError extends Error {}
export function hashRateLimitSubject(userId: string | null): string {
  return createHash("sha256").update(userId || "anonymous").digest("hex");
}

export class SupabaseRateLimiter implements RateLimiter {
  private readonly rpc: RateLimitRpc;
  constructor(rpc: RateLimitRpc) { this.rpc = rpc; }
  async check(userId: string | null): Promise<RateLimitResult> {
    try {
      const { data, error } = await this.rpc(hashRateLimitSubject(userId));
      const row = Array.isArray(data) ? data[0] : null;
      if (error || !row || typeof row !== "object" || typeof (row as { allowed?: unknown }).allowed !== "boolean" || typeof (row as { retry_after_seconds?: unknown }).retry_after_seconds !== "number") throw new Error("Invalid Supabase rate limit response");
      const result = row as { allowed: boolean; retry_after_seconds: number };
      return { allowed: result.allowed, retryAfterSeconds: result.retry_after_seconds };
    } catch {
      throw new RateLimitUnavailableError("Supabase rate limit unavailable");
    }
  }
}
