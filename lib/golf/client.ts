import "server-only";
import type { GolfClub } from "@/lib/golf/clubs";
import type { CalendarSettingsResponse, ReservationsResponse } from "@/lib/golf/types";

// No WiseGolf club has a public API — every club's endpoints were found in
// its own browser network traffic and, per CLAUDE-golf.md, work
// unauthenticated (no login, no session, nothing to store). Same shared
// fetch logic for every club; only the domain + productid differ, and those
// come from the club's config (lib/golf/clubs.ts), never hardcoded here.

const REQUEST_TIMEOUT_MS = 10_000;

async function getJson<T>(url: string): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch(url, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
      if (response.ok) return response.json() as Promise<T>;
      // Retrying a 4xx would only repeat a deterministic request failure.
      const error = new Error(`WiseGolf request failed (${response.status}) for ${url}`);
      if (response.status < 500 || attempt === 1) throw error;
      lastError = error;
    } catch (error) {
      if (error instanceof Error && /\(4\d\d\)/.test(error.message)) throw error;
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("WiseGolf request failed");
}

function baseUrl(club: GolfClub): string {
  return `https://${club.domain}/api/1.0`;
}

/** Booked seats for one day. Never read `.reservationsGolfPlayers` from this. */
export async function fetchReservations(
  club: GolfClub,
  productid: number,
  date: string
): Promise<ReservationsResponse> {
  const url = `${baseUrl(club)}/reservations/?productid=${productid}&date=${date}&golf=1`;
  return getJson<ReservationsResponse>(url);
}

/** Opening hours, slot length, capacity, and closure rules for one day. */
export async function fetchCalendarSettings(
  club: GolfClub,
  productid: number,
  date: string
): Promise<CalendarSettingsResponse> {
  const url = `${baseUrl(club)}/reservations/calendarsettings/?productid=${productid}&date=${date}`;
  return getJson<CalendarSettingsResponse>(url);
}
