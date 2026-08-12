import "server-only";
import { getCalendarVisibility, computeFreeSlots } from "@/lib/golf/availability";
import { fetchCalendarSettings, fetchReservations } from "@/lib/golf/client";
import { isInSeason, visibleHorizon, type GolfClub, type GolfCourse } from "@/lib/golf/clubs";
import type { CalendarSettingsResponse, ClubDayResult, FreeSlot, ReservationsResponse } from "@/lib/golf/types";

const CACHE_TTL_MS = 15 * 60 * 1000;
type ProductData = { reservations: ReservationsResponse; settings: CalendarSettingsResponse };
const productCache = new Map<string, { data: ProductData; expiresAt: number }>();
const productRequests = new Map<string, Promise<ProductData>>();

export type GolfSearchTarget = { club: GolfClub; course: GolfCourse };

export function helsinkiNow() {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Helsinki", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "00";
  return { date: `${value("year")}-${value("month")}-${value("day")}`, time: `${value("hour")}:${value("minute")}` };
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

async function getProductData(club: GolfClub, productid: number, date: string): Promise<ProductData> {
  const cacheKey = `${club.id}:${productid}:${date}`;
  const cached = productCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.data;
  const inFlight = productRequests.get(cacheKey);
  if (inFlight) return inFlight;
  const request = Promise.all([fetchReservations(club, productid, date), fetchCalendarSettings(club, productid, date)])
    .then(([reservations, settings]) => {
      const data = { reservations, settings };
      productCache.set(cacheKey, { data, expiresAt: Date.now() + CACHE_TTL_MS });
      return data;
    })
    .finally(() => productRequests.delete(cacheKey));
  productRequests.set(cacheKey, request);
  return request;
}

function base(club: GolfClub, course: GolfCourse) {
  return { club: club.id, nimi: club.nimi, clubId: club.id, clubName: club.nimi, courseId: course.id, courseName: course.nimi, courseCount: club.kentat.length };
}

function filterSlots(slots: FreeSlot[], min: number | null, after: string | null, before: string | null) {
  return slots.filter((slot) => (min === null || slot.availablePlayers >= min) && (!after || slot.aika >= after) && (!before || slot.aika <= before));
}

/** Shared availability engine for both the authenticated Golf UI and tool callers. */
export async function searchCourseDay(
  target: GolfSearchTarget,
  date: string,
  options: { min?: number | null; after?: string | null; before?: string | null; today?: string; helsinkiTime?: string } = {}
): Promise<ClubDayResult> {
  const { club, course } = target;
  const resultBase = base(club, course);
  const now = options.today && options.helsinkiTime ? { date: options.today, time: options.helsinkiTime } : helsinkiNow();
  if (!isInSeason(course, date)) return { ...resultBase, status: "kausi_kiinni", vapaat: [] };
  if (!course.horisonttiCalendarista && date > addDays(now.date, visibleHorizon(course, now.time))) {
    return { ...resultBase, status: "liian_kaukana", vapaat: [], horisonttiPaivia: visibleHorizon(course, now.time) };
  }
  try {
    const productData = course.horisonttiCalendarista ? await getProductData(club, course.productid, date) : undefined;
    const visibility = productData ? getCalendarVisibility(productData.settings.resourceRules, date, course.resourceId, productData.settings.reservationSettings.limitFutureReservations) : null;
    const horizonCourse = visibility ? { ...course, horisonttiPaivia: visibility.days, horisonttiAukeaa: visibility.opensAt ?? course.horisonttiAukeaa } : course;
    const horizon = visibleHorizon(horizonCourse, now.time);
    if (date > addDays(now.date, horizon)) return { ...resultBase, status: "liian_kaukana", vapaat: [], horisonttiPaivia: horizon };
    const data = productData ?? await getProductData(club, course.productid, date);
    const slots = computeFreeSlots(date, data.settings, data.reservations.rows, new Date(), course.resourceId);
    return { ...resultBase, status: "ok", vapaat: filterSlots(slots, options.min ?? null, options.after ?? null, options.before ?? null) };
  } catch {
    return { ...resultBase, status: "virhe", vapaat: [] };
  }
}
