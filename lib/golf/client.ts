import "server-only";
import type { GolfClub } from "@/lib/golf/clubs";
import type { CalendarSettingsResponse, ReservationsResponse } from "@/lib/golf/types";
import { authenticatedWiseGolfHeaders, WiseGolfAuthRequiredError } from "./wisegolf-auth.ts";

// No WiseGolf club has a public API — every club's endpoints were found in
// its own browser network traffic and, per CLAUDE-golf.md, work
// unauthenticated (no login, no session, nothing to store). Same shared
// fetch logic for every club; only the domain + productid differ, and those
// come from the club's config (lib/golf/clubs.ts), never hardcoded here.

const REQUEST_TIMEOUT_MS = 10_000;
const RESERVATIONS_CACHE_TTL_MS = 15 * 60 * 1000;
const reservationsCache = new Map<string, { data: ReservationsResponse; expiresAt: number }>();
const reservationsRequests = new Map<string, Promise<ReservationsResponse>>();

/** The configured WiseGolf session is absent or was rejected upstream. */
export { WiseGolfAuthRequiredError } from "./wisegolf-auth.ts";

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
  const cacheKey = `${club.domain}:${productid}:${date}`;
  const cached = reservationsCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.data;
  const inFlight = reservationsRequests.get(cacheKey);
  if (inFlight) return inFlight;
  const url = `${baseUrl(club)}/reservations/?productid=${productid}&date=${date}&golf=1`;
  const request = getJson<ReservationsResponse>(url)
    .then((data) => {
      reservationsCache.set(cacheKey, { data, expiresAt: Date.now() + RESERVATIONS_CACHE_TTL_MS });
      return data;
    })
    .finally(() => reservationsRequests.delete(cacheKey));
  reservationsRequests.set(cacheKey, request);
  return request;
}

/**
 * Fetch reservation players through the server-only WiseGolf session.
 * Authenticated responses are deliberately never cached: the payload can
 * contain public player names and the anonymous availability cache is shared.
 */
export async function fetchAuthenticatedReservations(
  club: GolfClub,
  productid: number,
  date: string
): Promise<ReservationsResponse> {
  const headers = authenticatedWiseGolfHeaders(club);
  const url = `${baseUrl(club)}/reservations/?productid=${productid}&date=${date}&golf=1`;
  let response: Response;
  try {
    response = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      cache: "no-store",
    });
  } catch {
    throw new Error("WiseGolf request failed");
  }
  if (response.status === 401 || response.status === 403) {
    throw new WiseGolfAuthRequiredError("WiseGolf authentication is required");
  }
  if (!response.ok) throw new Error(`WiseGolf request failed (${response.status})`);
  return response.json() as Promise<ReservationsResponse>;
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
