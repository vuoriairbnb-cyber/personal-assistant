import "server-only";
import type { GolfClubConfig } from "@/lib/golf/clubs";
import type { CalendarSettingsResponse, ReservationsResponse } from "@/lib/golf/types";

// No WiseGolf club has a public API — every club's endpoints were found in
// its own browser network traffic and, per CLAUDE-golf.md, work
// unauthenticated (no login, no session, nothing to store). Same shared
// fetch logic for every club; only the domain + productid differ, and those
// come from the club's config (lib/golf/clubs.ts), never hardcoded here.

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) {
    throw new Error(`WiseGolf request failed (${response.status}) for ${url}`);
  }
  return response.json() as Promise<T>;
}

function baseUrl(club: GolfClubConfig): string {
  return `https://${club.domain}/api/1.0`;
}

/** Booked seats for one day. Never read `.reservationsGolfPlayers` from this. */
export async function fetchReservations(
  club: GolfClubConfig,
  date: string
): Promise<ReservationsResponse> {
  const url = `${baseUrl(club)}/reservations/?productid=${club.productid}&date=${date}&golf=1`;
  return getJson<ReservationsResponse>(url);
}

/** Opening hours, slot length, capacity, and closure rules for one day. */
export async function fetchCalendarSettings(
  club: GolfClubConfig,
  date: string
): Promise<CalendarSettingsResponse> {
  const url = `${baseUrl(club)}/reservations/calendarsettings/?productid=${club.productid}&date=${date}`;
  return getJson<CalendarSettingsResponse>(url);
}
