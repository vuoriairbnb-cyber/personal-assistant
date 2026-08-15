/** Channel-neutral contract for a future notification dispatcher. Golf Watch only writes the outbox today. */
export interface NotificationEvent {
  id: string;
  eventType: string;
  sourceType: string;
  sourceId: string;
  payload: Record<string, unknown>;
}
export interface NotificationSendResult { ok: boolean; externalId?: string; error?: string; }
export interface NotificationSender { send(event: NotificationEvent): Promise<NotificationSendResult>; }
