export interface RateLimitResult { allowed: boolean; retryAfterSeconds: number }
export interface RateLimiter { check(userId: string | null, now?: number): Promise<RateLimitResult> }
