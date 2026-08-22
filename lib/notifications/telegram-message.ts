import type { NotificationEvent } from "./types";

type GolfWatchMatch = { course: string; date: string; time: string; available_spots: number };
type GolfWatchPayload = { course?: unknown; date?: unknown; time?: unknown; available_spots?: unknown; players?: unknown; time_from?: unknown; time_to?: unknown; matches?: unknown };
type PlayerWatchPayload = { player_name?: unknown; course?: unknown; date?: unknown; time?: unknown };

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
    for (const group of groups.values()) { lines.push(`${group[0]!.course} – ${displayDate(group[0]!.date)}`); group.forEach((match) => lines.push(`${match.time} — ${match.available_spots} paikkaa`)); lines.push(""); }
  }
  lines.push("Hakusi:");
  const from = typeof payload.time_from === "string" ? payload.time_from : null;
  const to = typeof payload.time_to === "string" ? payload.time_to : null;
  if (from && to) lines.push(`${from}–${to}`); else if (from) lines.push(`klo ${from} jälkeen`); else if (to) lines.push(`ennen klo ${to}`);
  lines.push(`${players} pelaajaa`);
  return lines.join("\n");
}

export function formatPlayerWatchTelegramMessage(payload: PlayerWatchPayload): string {
  const playerName = typeof payload.player_name === "string" && payload.player_name.trim() ? payload.player_name : "Pelaaja";
  const course = typeof payload.course === "string" && payload.course.trim() ? payload.course : "Golfkenttä";
  const date = typeof payload.date === "string" ? displayDate(payload.date) : "";
  const rawTime = typeof payload.time === "string" ? payload.time : "";
  const time = /^\d{2}:\d{2}$/.test(rawTime) ? rawTime.replace(":", ".") : rawTime;
  return ["👤 Pelaajavahti löysi uuden lähdön!", "", playerName, course, `${date}${time ? ` klo ${time}` : ""}`, "", "Pelaajavahti jatkaa seurantaa."].join("\n");
}

export function formatNotificationTelegramMessage(event: NotificationEvent): string {
  return event.eventType === "player_watch_match" ? formatPlayerWatchTelegramMessage(event.payload as PlayerWatchPayload) : formatGolfWatchTelegramMessage(event.payload as GolfWatchPayload);
}
