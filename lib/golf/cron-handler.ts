import { createHash, timingSafeEqual } from "node:crypto";

export type GolfWatchCronSummary = { processed: number; matched: number; rescheduled: number; expired: number; failed: number };
export type NotificationSummary = { attempted: number; sent: number; failed: number };
type Logger = Pick<Console, "info" | "error">;

function hashPrefix(value: string | null) {
  return value === null ? null : createHash("sha256").update(value).digest("hex").slice(0, 8);
}

function authorized(request: Request, rawSecret: string | undefined, logger: Logger) {
  // Whitespace accidentally added around a deployment environment variable is
  // not part of the secret. Internal secret characters are never modified.
  const secret = rawSecret?.trim() || null;
  const authorization = request.headers.get("authorization");
  const schemeMatch = authorization?.match(/^\s*([^\s]+)(?:\s+(.+?))?\s*$/);
  const scheme = schemeMatch?.[1] ?? null;
  const received = scheme?.toLowerCase() === "bearer" && schemeMatch?.[2]
    ? schemeMatch[2].trim() || null
    : null;
  logger.info("[golf-watch-auth] debug", {
    cronSecretConfigured: Boolean(secret),
    expectedLength: secret?.length ?? null,
    authorizationHeaderPresent: authorization !== null,
    authorizationScheme: scheme,
    receivedTokenLength: received?.length ?? null,
    expectedHashPrefix: hashPrefix(secret),
    receivedHashPrefix: hashPrefix(received),
  });
  if (!secret || !received) return false;
  const expected = Buffer.from(secret);
  const supplied = Buffer.from(received);
  return expected.length === supplied.length && timingSafeEqual(expected, supplied);
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
    if (!authorized(request, deps.secret, logger)) return Response.json({ error: "unauthorized" }, { status: 401 });
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
