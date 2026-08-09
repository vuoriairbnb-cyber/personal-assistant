import "server-only";
import ical from "node-ical";
import type { CalendarResponse, VEvent } from "node-ical";

export interface ParsedIcalEvent {
  externalId: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  location: string | null;
}

/**
 * Fetches and parses the Airbnb "Export Calendar" iCal feed configured via
 * AIRBNB_ICAL_URL. The URL itself is a bearer secret (Airbnb embeds an access
 * token in the query string) — never expose it to the client, never log it.
 */
export async function fetchAirbnbEvents(): Promise<ParsedIcalEvent[]> {
  const url = process.env.AIRBNB_ICAL_URL;
  if (!url) {
    throw new Error("AIRBNB_ICAL_URL is not set. Add it to your server environment.");
  }

  let parsed: CalendarResponse;
  try {
    parsed = await ical.async.fromURL(url);
  } catch {
    // Swallow the underlying error message: it may echo the request URL,
    // which contains the access token.
    throw new Error("Could not reach the Airbnb calendar feed.");
  }

  return Object.values(parsed)
    .filter((component): component is VEvent => component?.type === "VEVENT")
    .map((event) => ({
      externalId: event.uid,
      title: typeof event.summary === "string" ? event.summary : "Airbnb reservation",
      start: event.start.toISOString(),
      end: (event.end ?? event.start).toISOString(),
      allDay: event.datetype === "date",
      location: typeof event.location === "string" ? event.location : null,
    }));
}
