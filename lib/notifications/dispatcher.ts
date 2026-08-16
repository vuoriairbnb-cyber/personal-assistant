import "server-only";
import { createServiceSupabaseClient } from "@/lib/supabase/service";
import type { Database } from "@/types/database";
import { TelegramSender } from "./telegram";

type OutboxEvent = Database["public"]["Tables"]["notification_outbox"]["Row"];
export type NotificationDispatchSummary = { attempted: number; sent: number; failed: number };

function safeError(error: unknown) {
  const item = error && typeof error === "object" ? error as { name?: unknown; statusCode?: unknown } : {};
  return { name: typeof item.name === "string" ? item.name.slice(0, 80) : "Error", message: "notification delivery failed", ...(typeof item.statusCode === "number" ? { statusCode: item.statusCode } : {}) };
}

export async function processPendingNotifications(limit = 25): Promise<NotificationDispatchSummary> {
  const service = createServiceSupabaseClient();
  const { data, error } = await service.rpc("claim_pending_notification_outbox", { p_limit: limit });
  if (error) throw new Error("Notification claim failed");
  const events = (data ?? []) as OutboxEvent[];
  const sender = new TelegramSender();
  const summary = { attempted: 0, sent: 0, failed: 0 };
  for (const event of events) {
    summary.attempted += 1;
    console.info("[notification] telegram delivery started", { eventId: event.id });
    try {
      const result = await sender.send({ id: event.id, eventType: event.event_type, sourceType: event.source_type, sourceId: event.source_id, payload: event.payload });
      const { error: updateError } = await service.from("notification_outbox").update({
        status: "processed", processed_at: new Date().toISOString(), processing_started_at: null,
        channel: "telegram", delivery_attempts: event.delivery_attempts + 1,
        last_error: null, provider_message_id: result.externalId ?? null,
      }).eq("id", event.id).eq("status", "processing");
      if (updateError) throw updateError;
      summary.sent += 1;
      console.info("[notification] telegram delivery sent", { eventId: event.id, telegramMessageId: result.externalId ? Number(result.externalId) : undefined });
    } catch (error) {
      const attempt = event.delivery_attempts + 1;
      const status = attempt >= 3 ? "failed" : "pending";
      const { error: updateError } = await service.from("notification_outbox").update({ status, processing_started_at: null, delivery_attempts: attempt, last_error: "notification delivery failed" }).eq("id", event.id).eq("status", "processing");
      summary.failed += 1;
      console.error("[notification] telegram delivery failed", { eventId: event.id, attempt, error: safeError(updateError ?? error) });
    }
  }
  return summary;
}
