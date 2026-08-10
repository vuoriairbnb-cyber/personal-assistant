import "server-only";
import type { GolfClub, GolfCourse } from "@/lib/golf/clubs";
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

function baseUrl(club: GolfClub): string {
  return `https://${club.domain}/api/1.0`;
}

/** Booked seats for one day. Never read `.reservationsGolfPlayers` from this. */
export async function fetchReservations(
  club: GolfClub,
  course: GolfCourse,
  date: string
): Promise<ReservationsResponse> {
  const url = `${baseUrl(club)}/reservations/?productid=${course.productid}&date=${date}&golf=1`;
  return getJson<ReservationsResponse>(url);
}

/** Opening hours, slot length, capacity, and closure rules for one day. */
export async function fetchCalendarSettings(
  club: GolfClub,
  course: GolfCourse,
  date: string
): Promise<CalendarSettingsResponse> {
  const url = `${baseUrl(club)}/reservations/calendarsettings/?productid=${course.productid}&date=${date}`;
  return getJson<CalendarSettingsResponse>(url);
}
