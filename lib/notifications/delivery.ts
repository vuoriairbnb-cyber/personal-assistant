import type { NotificationEvent, NotificationSender, NotificationSendResult } from "./types";

export type ClaimedNotification = NotificationEvent & { deliveryAttempts: number };
export type NotificationDispatchSummary = { attempted: number; sent: number; failed: number };
type Logger = Pick<Console, "info" | "error">;

function safeError(error: unknown) {
  const item = error && typeof error === "object" ? error as { name?: unknown; statusCode?: unknown } : {};
  return { name: typeof item.name === "string" ? item.name.slice(0, 80) : "Error", message: "notification delivery failed", ...(typeof item.statusCode === "number" ? { statusCode: item.statusCode } : {}) };
}

export async function dispatchClaimedNotifications(
  events: ClaimedNotification[],
  sender: NotificationSender,
  persistence: { markProcessed(event: ClaimedNotification, result: NotificationSendResult): Promise<void>; markFailed(event: ClaimedNotification, status: "pending" | "failed"): Promise<void> },
  logger: Logger = console,
): Promise<NotificationDispatchSummary> {
  const summary = { attempted: 0, sent: 0, failed: 0 };
  for (const event of events) {
    summary.attempted += 1;
    const isPlayerWatch = event.eventType === "player_watch_match";
    logger.info(isPlayerWatch ? "[notification] player watch telegram delivery started" : "[notification] telegram delivery started", { eventId: event.id });
    try {
      const result = await sender.send(event);
      await persistence.markProcessed(event, result);
      summary.sent += 1;
      logger.info(isPlayerWatch ? "[notification] player watch telegram delivery sent" : "[notification] telegram delivery sent", { eventId: event.id, telegramMessageId: result.externalId ? Number(result.externalId) : undefined });
    } catch (error) {
      const status = event.deliveryAttempts + 1 >= 3 ? "failed" : "pending";
      try { await persistence.markFailed(event, status); }
      catch (updateError) { error = updateError; }
      summary.failed += 1;
      logger.error("[notification] telegram delivery failed", { eventId: event.id, attempt: event.deliveryAttempts + 1, error: safeError(error) });
    }
  }
  return summary;
}
