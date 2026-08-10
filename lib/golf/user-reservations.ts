import "server-only";
import type { CalendarEvent } from "@/lib/calendar/types";

/** Status returned alongside (possibly empty) golf calendar events. */
export type OmatVarauksetStatus = "ok" | "ei_kirjautunut" | "virhe";

export interface OmatVarauksetResult {
  status: OmatVarauksetStatus;
  events: CalendarEvent[];
}

/** Raw WiseGolf reservation row from getusergolfreservations. */
interface RawUserReservationRow {
  id?: number | string;
  start: string; // "YYYY-MM-DD HH:MM:SS"
  end: string;
  [key: string]: unknown;
}

interface RawUserReservationsResponse {
  success: boolean;
  rows: RawUserReservationRow[];
}

/** Convert "YYYY-MM-DD HH:MM:SS" → ISO "YYYY-MM-DDTHH:MM:SS". */
function toIso(wisegolfDatetime: string): string {
  return wisegolfDatetime.replace(" ", "T");
}

/**
 * Fetch the signed-in user's own golf reservations from HGK's WiseGolf API.
 *
 * Reads HGK_SESSION_COOKIE from the environment. If unset/empty, returns
 * "ei_kirjautunut" immediately — the calendar shows nothing gracefully.
 * WiseGolf API errors → "virhe", also graceful.
 *
 * Read-only. Never used for booking, cancellation, or any write operation.
 */
export async function fetchOmatVaraukset(): Promise<OmatVarauksetResult> {
  const sessionValue = process.env.wisenetwork_session;
  if (!sessionValue) {
    return { status: "ei_kirjautunut", events: [] };
  }

  let data: RawUserReservationsResponse;
  try {
    const response = await fetch(
      "https://api.helsingingolfklubi.fi/api/1.0/reservations/getusergolfreservations/",
      {
        headers: {
          Accept: "application/json",
          Cookie: `wisenetwork_session=${sessionValue}`,
        },
        // Don't cache — reservations change; we always want the live list.
        cache: "no-store",
      }
    );

    if (!response.ok) {
      return { status: "virhe", events: [] };
    }

    data = (await response.json()) as RawUserReservationsResponse;
  } catch {
    return { status: "virhe", events: [] };
  }

  if (!data.success) {
    return { status: "virhe", events: [] };
  }

  const events: CalendarEvent[] = data.rows.map((row, index) => ({
    id: `golf-hgk-${row.id ?? index}`,
    title: "Golf: Helsingin Golfklubi",
    start: toIso(row.start),
    end: toIso(row.end),
    allDay: false,
    source: "golf",
    location: null,
    notes: null,
    tripId: null,
  }));

  return { status: "ok", events };
}
