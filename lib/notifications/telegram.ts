import "server-only";
import type { NotificationEvent, NotificationSender, NotificationSendResult } from "./types";

export class TelegramConfigurationError extends Error {}
export class TelegramDeliveryError extends Error {
  readonly statusCode?: number;
  constructor(message: string, statusCode?: number) { super(message); this.statusCode = statusCode; }
}

type GolfWatchMatch = { course: string; date: string; time: string; available_spots: number };
type GolfWatchPayload = { course?: unknown; date?: unknown; time?: unknown; available_spots?: unknown; players?: unknown; time_from?: unknown; time_to?: unknown; matches?: unknown };

function displayDate(date: string) { return /^\d{4}-\d{2}-\d{2}$/.test(date) ? `${date.slice(8, 10)}.${date.slice(5, 7)}.${date.slice(0, 4)}` : date; }
function payloadMatches(payload: GolfWatchPayload): GolfWatchMatch[] {
  if (!Array.isArray(payload.matches)) return [];
  return payload.matches.filter((item): item is GolfWatchMatch => Boolean(item) && typeof item === "object" && typeof (item as GolfWatchMatch).course === "string" && typeof (item as GolfWatchMatch).date === "string" && typeof (item as GolfWatchMatch).time === "string" && typeof (item as GolfWatchMatch).available_spots === "number")
    .sort((left, right) => left.course.localeCompare(right.course, "fi-FI") || left.time.localeCompare(right.time));
}

export function formatGolfWatchTelegramMessage(payload: GolfWatchPayload): string {
  const course = typeof payload.course === "string" ? payload.course : "Golfkenttä";
  const date = typeof payload.date === "string" ? payload.date : "";
  const time = typeof payload.time === "string" ? payload.time : "";
  const spots = typeof payload.available_spots === "number" ? payload.available_spots : 0;
  const players = typeof payload.players === "number" ? payload.players : 1;
  const matches = payloadMatches(payload);
  const lines = matches.length > 1 ? ["⛳ Golf-vahti löysi aikoja!", ""] : ["⛳ Golf-vahti löysi ajan!", "", course, `${displayDate(date)}${time ? ` klo ${time}` : ""}`, `${spots} paikkaa vapaana`, ""];
  if (matches.length > 1) {
    const groups = new Map<string, GolfWatchMatch[]>();
    for (const match of matches) { const key = `${match.course}\u0000${match.date}`; groups.set(key, [...(groups.get(key) ?? []), match]); }
    for (const group of groups.values()) {
      lines.push(`${group[0]!.course} – ${displayDate(group[0]!.date)}`);
      group.forEach((match) => lines.push(`${match.time} — ${match.available_spots} paikkaa`));
      lines.push("");
    }
  }
  lines.push("Hakusi:");
  const from = typeof payload.time_from === "string" ? payload.time_from : null;
  const to = typeof payload.time_to === "string" ? payload.time_to : null;
  if (from && to) lines.push(`${from}–${to}`);
  else if (from) lines.push(`klo ${from} jälkeen`);
  else if (to) lines.push(`ennen klo ${to}`);
  lines.push(`${players} pelaajaa`);
  return lines.join("\n");
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
    for (const text of splitTelegramText(formatGolfWatchTelegramMessage(event.payload as GolfWatchPayload))) {
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
