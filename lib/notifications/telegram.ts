import "server-only";
import type { NotificationEvent, NotificationSender, NotificationSendResult } from "./types";

export class TelegramConfigurationError extends Error {}
export class TelegramDeliveryError extends Error {
  readonly statusCode?: number;
  constructor(message: string, statusCode?: number) { super(message); this.statusCode = statusCode; }
}

type GolfWatchPayload = { course?: unknown; date?: unknown; time?: unknown; available_spots?: unknown; players?: unknown; time_from?: unknown; time_to?: unknown };

export function formatGolfWatchTelegramMessage(payload: GolfWatchPayload): string {
  const course = typeof payload.course === "string" ? payload.course : "Golfkenttä";
  const date = typeof payload.date === "string" ? payload.date : "";
  const time = typeof payload.time === "string" ? payload.time : "";
  const spots = typeof payload.available_spots === "number" ? payload.available_spots : 0;
  const players = typeof payload.players === "number" ? payload.players : 1;
  const displayDate = /^\d{4}-\d{2}-\d{2}$/.test(date) ? `${date.slice(8, 10)}.${date.slice(5, 7)}.${date.slice(0, 4)}` : date;
  const lines = ["⛳ Golf-vahti löysi ajan!", "", course, `${displayDate}${time ? ` klo ${time}` : ""}`, `${spots} paikkaa vapaana`, "", "Hakusi:"];
  const from = typeof payload.time_from === "string" ? payload.time_from : null;
  const to = typeof payload.time_to === "string" ? payload.time_to : null;
  if (from && to) lines.push(`${from}–${to}`);
  else if (from) lines.push(`klo ${from} jälkeen`);
  else if (to) lines.push(`ennen klo ${to}`);
  lines.push(`${players} pelaajaa`);
  return lines.join("\n");
}

export class TelegramSender implements NotificationSender {
  async send(event: NotificationEvent): Promise<NotificationSendResult> {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!token || !chatId) throw new TelegramConfigurationError("Telegram notification configuration is missing");
    const text = formatGolfWatchTelegramMessage(event.payload as GolfWatchPayload);
    let response: Response;
    try {
      response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text }),
      });
    } catch { throw new TelegramDeliveryError("Telegram request failed"); }
    if (!response.ok) throw new TelegramDeliveryError("Telegram request failed", response.status);
    let body: unknown;
    try { body = await response.json(); } catch { throw new TelegramDeliveryError("Telegram returned an invalid response"); }
    const messageId = body && typeof body === "object" && "result" in body && (body as { result?: { message_id?: unknown } }).result?.message_id;
    if (typeof messageId !== "number") throw new TelegramDeliveryError("Telegram returned an invalid response");
    return { ok: true, externalId: String(messageId) };
  }
}
