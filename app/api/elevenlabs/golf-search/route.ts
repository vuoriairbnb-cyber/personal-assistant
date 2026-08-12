import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { runGolfToolSearch, validateGolfToolQuery, GolfToolError } from "@/lib/elevenlabs/golf-search";
import { getGolfRateLimiter } from "@/lib/elevenlabs/rate-limit";
import { RateLimitUnavailableError } from "@/lib/elevenlabs/rate-limit/supabase";

const MAX_BODY_BYTES = 8_192;

function authorized(request: NextRequest): boolean {
  const secret = process.env.ELEVENLABS_GOLF_TOOL_SECRET;
  const header = request.headers.get("authorization");
  if (!secret || !header?.startsWith("Bearer ")) return false;
  const supplied = header.slice(7);
  const expectedBuffer = Buffer.from(secret);
  const suppliedBuffer = Buffer.from(supplied);
  return expectedBuffer.length === suppliedBuffer.length && timingSafeEqual(expectedBuffer, suppliedBuffer);
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_BODY_BYTES) return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  let body: unknown;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY_BYTES) throw new Error("too large");
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }
  try {
    const query = validateGolfToolQuery(body);
    const rate = await getGolfRateLimiter().check(query.userId);
    if (!rate.allowed) return NextResponse.json({ ok: false, error: "rate_limit", retry_after_seconds: rate.retryAfterSeconds }, { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } });
    return NextResponse.json(await runGolfToolSearch(query));
  } catch (error) {
    if (error instanceof RateLimitUnavailableError) return NextResponse.json({ ok: false, error: "Golf search unavailable" }, { status: 503 });
    if (error instanceof GolfToolError) return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    return NextResponse.json({ ok: false, error: "Golf search failed" }, { status: 502 });
  }
}
