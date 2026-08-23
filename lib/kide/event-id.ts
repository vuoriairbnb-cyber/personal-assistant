import { KideError } from "./types.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function isKideUuid(value: unknown): value is string { return typeof value === "string" && UUID.test(value); }

export function parseKideEventId(input: string): string {
  const value = input.trim();
  if (isKideUuid(value)) return value.toLowerCase();
  let url: URL;
  try { url = new URL(value); }
  catch { throw new KideError("Anna kelvollinen Kide-tapahtuman URL tai tunniste.", 400); }
  if (url.protocol !== "https:" || !["kide.app", "www.kide.app"].includes(url.hostname.toLowerCase())) {
    throw new KideError("Anna Kide.app-tapahtuman URL.", 400);
  }
  const parts = url.pathname.split("/").filter(Boolean);
  const eventId = parts.length === 2 && parts[0] === "events" ? parts[1] : null;
  if (!eventId || !isKideUuid(eventId)) throw new KideError("Anna kelvollinen Kide-tapahtuman URL tai tunniste.", 400);
  return eventId.toLowerCase();
}
