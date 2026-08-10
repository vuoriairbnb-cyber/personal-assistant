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
  [key: string]: unknown;
}

interface RawUserReservationsResponse {
  success: boolean;
  rows: RawUserReservationRow[];
}

/** Convert "YYYY-MM-DD HH:MM:SS" → ISO "YYYY-MM-DDTHH:MM:SS". */
function toIso(v: unknown): string {
  if (typeof v === "string") return v.replace(" ", "T");
  return "";
}

/** Pick the first truthy value from a row for a set of candidate field names. */
function pick(row: RawUserReservationRow, ...keys: string[]): unknown {
  for (const k of keys) if (row[k]) return row[k];
  return undefined;
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

  if (!data.success || !Array.isArray(data.rows)) {
    return { status: "virhe", events: [] };
  }

  // Log the first row's keys to help diagnose field names (visible in Vercel function logs).
  if (data.rows.length > 0) {
    console.log("[golf/omat-varaukset] first row keys:", Object.keys(data.rows[0]!));
    console.log("[golf/omat-varaukset] first row:", JSON.stringify(data.rows[0]));
  }

  const events: CalendarEvent[] = data.rows
    .map((row, index): CalendarEvent | null => {
      const startRaw = pick(row, "start", "startTime", "startDate", "dateStart", "reservationStart");
      const endRaw = pick(row, "end", "endTime", "endDate", "dateEnd", "reservationEnd");
      const startIso = toIso(startRaw);
      const endIso = toIso(endRaw);
      // Skip rows where we can't determine the datetime.
      if (!startIso || !endIso) return null;
      return {
        id: `golf-hgk-${String(row.id ?? index)}`,
        title: "Golf: Helsingin Golfklubi",
        start: startIso,
        end: endIso,
        allDay: false,
        source: "golf",
        location: null,
        notes: null,
        tripId: null,
      };
    })
    .filter((e): e is NonNullable<typeof e> => e !== null);

  return { status: "ok", events };
}
