import { timingSafeEqual } from "node:crypto";

export type GolfWatchCronSummary = { processed: number; matched: number; rescheduled: number; expired: number; failed: number };
export type NotificationSummary = { attempted: number; sent: number; failed: number };
type Logger = Pick<Console, "info" | "error">;

function authorized(request: Request, secret: string | undefined) {
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/, "");
  if (!secret || !supplied) return false;
  const expected = Buffer.from(secret);
  const received = Buffer.from(supplied);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export function createGolfWatchCronHandler(deps: {
  secret: string | undefined;
  processWatches: () => Promise<GolfWatchCronSummary>;
  processNotifications: () => Promise<NotificationSummary>;
  logger?: Logger;
  now?: () => number;
}) {
  const logger = deps.logger ?? console;
  const now = deps.now ?? Date.now;
  return async (request: Request) => {
    if (!authorized(request, deps.secret)) return Response.json({ error: "unauthorized" }, { status: 401 });
    const startedAt = now();
    logger.info("[golf-watch] cron started");
    try {
      const summary = await deps.processWatches();
      const notifications = await deps.processNotifications();
      const durationMs = now() - startedAt;
      logger.info("[golf-watch] cron complete", { ...summary, durationMs });
      return Response.json({ ok: true, ...summary, notifications, duration_ms: durationMs });
    } catch (error) {
      const durationMs = now() - startedAt;
      logger.error("[golf-watch] cron failed", { error: { name: error instanceof Error ? error.name : "Error", message: "cron processing unavailable" }, durationMs });
      return Response.json({ ok: false, error: "Golf watch processing unavailable" }, { status: 503 });
    }
  };
}
