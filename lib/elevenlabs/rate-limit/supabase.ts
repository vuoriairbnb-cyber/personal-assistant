import { createHash } from "node:crypto";
import type { RateLimiter, RateLimitResult } from "./types.ts";

export type RateLimitRpc = (userHash: string) => Promise<{ data: unknown; error: unknown }>;
export class RateLimitUnavailableError extends Error {}
export function hashRateLimitSubject(userId: string | null): string {
  return createHash("sha256").update(userId || "anonymous").digest("hex");
}

function isRateLimitRow(value: unknown): value is { allowed: boolean; retry_after_seconds: number } {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  const keys = Object.keys(row);
  return keys.length === 2
    && keys.includes("allowed")
    && keys.includes("retry_after_seconds")
    && typeof row.allowed === "boolean"
    && typeof row.retry_after_seconds === "number"
    && Number.isSafeInteger(row.retry_after_seconds)
    && row.retry_after_seconds >= 0;
}

export class SupabaseRateLimiter implements RateLimiter {
  private readonly rpc: RateLimitRpc;
  constructor(rpc: RateLimitRpc) { this.rpc = rpc; }
  async check(userId: string | null): Promise<RateLimitResult> {
    try {
      const { data, error } = await this.rpc(hashRateLimitSubject(userId));
      const row = Array.isArray(data) && data.length === 1 ? data[0] : null;
      if (error || !isRateLimitRow(row)) throw new Error("Invalid Supabase rate limit response");
      return { allowed: row.allowed, retryAfterSeconds: row.retry_after_seconds };
    } catch {
      throw new RateLimitUnavailableError("Supabase rate limit unavailable");
    }
  }
}
