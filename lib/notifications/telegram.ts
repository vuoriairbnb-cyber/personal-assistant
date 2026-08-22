import "server-only";
import type { NotificationEvent, NotificationSender, NotificationSendResult } from "./types";
import { formatNotificationTelegramMessage } from "./telegram-message";

export { formatGolfWatchTelegramMessage, formatNotificationTelegramMessage, formatPlayerWatchTelegramMessage } from "./telegram-message";
export class TelegramConfigurationError extends Error {}
export class TelegramDeliveryError extends Error {
  readonly statusCode?: number;
  constructor(message: string, statusCode?: number) { super(message); this.statusCode = statusCode; }
}

function splitTelegramText(text: string, maximum = 4000): string[] {
  if (text.length <= maximum) return [text];
  const chunks: string[] = []; let current = "";
  for (const line of text.split("\n")) {
    if (current && current.length + line.length + 1 > maximum) { chunks.push(current); current = line; }
    else current += `${current ? "\n" : ""}${line}`;
  }
  if (current) chunks.push(current);
  return chunks;
}

export class TelegramSender implements NotificationSender {
  async send(event: NotificationEvent): Promise<NotificationSendResult> {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!token || !chatId) throw new TelegramConfigurationError("Telegram notification configuration is missing");
    let messageId: number | null = null;
    for (const text of splitTelegramText(formatNotificationTelegramMessage(event))) {
      let response: Response;
      try { response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: chatId, text }) }); }
      catch { throw new TelegramDeliveryError("Telegram request failed"); }
      if (!response.ok) throw new TelegramDeliveryError("Telegram request failed", response.status);
      let body: unknown;
      try { body = await response.json(); } catch { throw new TelegramDeliveryError("Telegram returned an invalid response"); }
      const id = body && typeof body === "object" && "result" in body && (body as { result?: { message_id?: unknown } }).result?.message_id;
      if (typeof id !== "number") throw new TelegramDeliveryError("Telegram returned an invalid response");
      messageId = id;
    }
    return { ok: true, externalId: String(messageId) };
  }
}
