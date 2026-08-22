import "server-only";
import { createServiceSupabaseClient } from "@/lib/supabase/service";
import type { Database } from "@/types/database";
import { TelegramSender } from "./telegram";
import { dispatchClaimedNotifications, type NotificationDispatchSummary } from "./delivery";

type OutboxEvent = Database["public"]["Tables"]["notification_outbox"]["Row"];
export type { NotificationDispatchSummary } from "./delivery";

export async function processPendingNotifications(limit = 25): Promise<NotificationDispatchSummary> {
  const service = createServiceSupabaseClient();
  const { data, error } = await service.rpc("claim_pending_notification_outbox", { p_limit: limit });
  if (error) throw new Error("Notification claim failed");
  const events = (data ?? []) as OutboxEvent[];
  const sender = new TelegramSender();
  return dispatchClaimedNotifications(events.map((event) => ({
    id: event.id, eventType: event.event_type, sourceType: event.source_type, sourceId: event.source_id, payload: event.payload, deliveryAttempts: event.delivery_attempts,
  })), sender, {
    async markProcessed(event, result) {
      const { error: updateError } = await service.from("notification_outbox").update({
        status: "processed", processed_at: new Date().toISOString(), processing_started_at: null, channel: "telegram",
        delivery_attempts: event.deliveryAttempts + 1, last_error: null, provider_message_id: result.externalId ?? null,
      }).eq("id", event.id).eq("status", "processing");
      if (updateError) throw updateError;
    },
    async markFailed(event, status) {
      const { error: updateError } = await service.from("notification_outbox").update({
        status, processing_started_at: null, delivery_attempts: event.deliveryAttempts + 1, last_error: "notification delivery failed",
      }).eq("id", event.id).eq("status", "processing");
      if (updateError) throw updateError;
    },
  });
}
