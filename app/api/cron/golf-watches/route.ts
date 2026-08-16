import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { processDueGolfWatches } from "@/lib/golf/watches";
import { processPendingNotifications } from "@/lib/notifications/dispatcher";

function authorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/, "");
  if (!secret || !supplied) return false;
  const expected = Buffer.from(secret);
  const received = Buffer.from(supplied);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const startedAt = Date.now();
  console.info("[golf-watch] cron started");
  try {
    const summary = await processDueGolfWatches();
    const notifications = await processPendingNotifications();
    const durationMs = Date.now() - startedAt;
    console.info("[golf-watch] cron complete", { ...summary, durationMs });
    return NextResponse.json({ ok: true, ...summary, notifications, duration_ms: durationMs });
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    console.error("[golf-watch] cron failed", { error: { name: error instanceof Error ? error.name : "Error", message: "cron processing unavailable" }, durationMs });
    return NextResponse.json({ ok: false, error: "Golf watch processing unavailable" }, { status: 503 });
  }
}
