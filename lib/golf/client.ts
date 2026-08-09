import "server-only";
import type { CalendarSettingsResponse, ReservationsResponse } from "@/lib/golf/types";

// Helsingin Golfklubi's WiseGolf instance. No public API exists — these
// endpoints were found in the club's own browser network traffic and, per
// CLAUDE-golf.md, work unauthenticated (no login, no session, nothing to
// store). Other clubs run their own api.<club>.fi domain with their own
// productId; only HGK is wired up for now.
const BASE_URL = "https://api.helsingingolfklubi.fi/api/1.0";
const PRODUCT_ID = 7; // "Golf Ajanvaraus 18r"

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) {
    throw new Error(`WiseGolf request failed (${response.status}) for ${url}`);
  }
  return response.json() as Promise<T>;
}

/** Booked seats for one day. Never read `.reservationsGolfPlayers` from this. */
export async function fetchReservations(date: string): Promise<ReservationsResponse> {
  const url = `${BASE_URL}/reservations/?productid=${PRODUCT_ID}&date=${date}&golf=1`;
  return getJson<ReservationsResponse>(url);
}

/** Opening hours, slot length, capacity, and closure rules for one day. */
export async function fetchCalendarSettings(date: string): Promise<CalendarSettingsResponse> {
  const url = `${BASE_URL}/reservations/calendarsettings/?productid=${PRODUCT_ID}&date=${date}`;
  return getJson<CalendarSettingsResponse>(url);
}
