import { NextResponse, type NextRequest } from "next/server";
import { requireApprovedUser } from "@/lib/auth/guard";
import {
  DEFAULT_CLUB_ID,
  getClub,
  getCourse,
  isInSeason,
  visibleHorizon,
  type GolfClub,
  type GolfCourse,
} from "@/lib/golf/clubs";
import { fetchCalendarSettings, fetchReservations } from "@/lib/golf/client";
import { computeFreeSlots, getCalendarVisibility } from "@/lib/golf/availability";
import type {
  CalendarSettingsResponse,
  ClubDayResult,
  DayGroup,
  FreeSlot,
  ReservationsResponse,
} from "@/lib/golf/types";

const CACHE_TTL_MS = 15 * 60 * 1000;

// Raw slots are cached per course. A multi-course club must never share a
// cached response between product IDs.
type ProductData = { reservations: ReservationsResponse; settings: CalendarSettingsResponse };
const productCache = new Map<string, { data: ProductData; expiresAt: number }>();
const productRequests = new Map<string, Promise<ProductData>>();

function helsinkiNow() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Helsinki",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "00";
  return { date: `${value("year")}-${value("month")}-${value("day")}`, time: `${value("hour")}:${value("minute")}` };
}

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function resultBase(club: GolfClub, course: GolfCourse) {
  return {
    club: club.id,
    nimi: club.nimi,
    clubId: club.id,
    clubName: club.nimi,
    courseId: course.id,
    courseName: course.nimi,
    courseCount: club.kentat.length,
  };
}

async function getProductData(club: GolfClub, productid: number, date: string): Promise<ProductData> {
  const cacheKey = `${club.id}:${productid}:${date}`;
  const cached = productCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  const inFlight = productRequests.get(cacheKey);
  if (inFlight) return inFlight;

  const request = Promise.all([
    fetchReservations(club, productid, date),
    fetchCalendarSettings(club, productid, date),
  ])
    .then(([reservations, settings]) => {
      const data = { reservations, settings };
      productCache.set(cacheKey, { data, expiresAt: Date.now() + CACHE_TTL_MS });
      return data;
    })
    .finally(() => productRequests.delete(cacheKey));
  productRequests.set(cacheKey, request);
  return request;
}

async function getRawVapaat(
  club: GolfClub,
  course: GolfCourse,
  date: string,
  productData?: ProductData
): Promise<FreeSlot[]> {
  const { reservations, settings } = productData ?? await getProductData(club, course.productid, date);
  // Product responses are cached above. Recompute the course view every
  // request so time-sensitive bookableNow transitions are never stale.
  return computeFreeSlots(date, settings, reservations.rows, new Date(), course.resourceId);
}

function filterSlots(vapaat: FreeSlot[], min: number | null, after: string | null, before: string | null) {
  return vapaat.filter((slot) => {
    if (min !== null && slot.vapaita < min) return false;
    if (after && slot.aika < after) return false;
    if (before && slot.aika >= before) return false;
    return true;
  });
}

function parseMin(raw: string | null): number | null {
  if (raw === null) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/** Each course has an independent failure boundary, including courses in the same club. */
async function getCourseDayResult(
  club: GolfClub,
  course: GolfCourse,
  date: string,
  today: string,
  helsinkiTime: string,
  min: number | null,
  after: string | null,
  before: string | null
): Promise<ClubDayResult> {
  const base = resultBase(club, course);
  if (!isInSeason(course, date)) return { ...base, status: "kausi_kiinni", vapaat: [] };

  // Existing courses keep their config-only horizon check. Courses that opt
  // into calendar rules load the already-needed shared product response once
  // and let kalenteriNakyvyysPaivat/localTime override that fallback.
  if (!course.horisonttiCalendarista) {
    const horisonttiPaivia = visibleHorizon(course, helsinkiTime);
    if (date > addDays(today, horisonttiPaivia)) {
      return { ...base, status: "liian_kaukana", vapaat: [], horisonttiPaivia };
    }
  }

  try {
    const productData = course.horisonttiCalendarista
      ? await getProductData(club, course.productid, date)
      : undefined;
    const visibility = productData
      ? getCalendarVisibility(
          productData.settings.resourceRules,
          date,
          course.resourceId,
          productData.settings.reservationSettings.limitFutureReservations
        )
      : null;
    const horizonCourse = visibility
      ? {
          ...course,
          horisonttiPaivia: visibility.days,
          horisonttiAukeaa: visibility.opensAt ?? course.horisonttiAukeaa,
        }
      : course;
    const horisonttiPaivia = visibleHorizon(horizonCourse, helsinkiTime);
    if (date > addDays(today, horisonttiPaivia)) {
      return { ...base, status: "liian_kaukana", vapaat: [], horisonttiPaivia };
    }

    const raw = await getRawVapaat(club, course, date, productData);
    return { ...base, status: "ok", vapaat: filterSlots(raw, min, after, before) };
  } catch {
    return { ...base, status: "virhe", vapaat: [] };
  }
}

function parseClubs(raw: string): { clubs: GolfClub[]; unknown: string[] } {
  const ids = raw.split(",").map((s) => s.trim()).filter(Boolean);
  const clubs: GolfClub[] = [];
  const unknown: string[] = [];
  for (const id of ids) {
    const club = getClub(id);
    if (club) clubs.push(club);
    else unknown.push(id);
  }
  return { clubs, unknown };
}

/** course accepts clubId:courseId entries, e.g. pickala:forest. */
function parseCourseFilter(raw: string | null, clubs: GolfClub[]) {
  const selected = new Map<string, GolfCourse[]>();
  if (!raw) return { selected, error: null as string | null };

  for (const entry of raw.split(",").map((item) => item.trim()).filter(Boolean)) {
    const [clubId, courseId, extra] = entry.split(":");
    const club = clubId ? getClub(clubId) : undefined;
    const course = club && courseId && !extra ? getCourse(club, courseId) : undefined;
    if (!club || !course || !clubs.some((selectedClub) => selectedClub.id === club.id)) {
      return { selected, error: `Tuntematon tai valitsemattomaan seuraan kuuluva kenttä: ${entry}` };
    }
    const courses = selected.get(club.id) ?? [];
    if (!courses.some((item) => item.id === course.id)) courses.push(course);
    selected.set(club.id, courses);
  }
  return { selected, error: null as string | null };
}

export async function GET(request: NextRequest) {
  try {
    await requireApprovedUser();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kirjaudu sisään.";
    return NextResponse.json({ error: message }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const { clubs, unknown } = parseClubs(searchParams.get("club") ?? DEFAULT_CLUB_ID);
  if (unknown.length > 0) return NextResponse.json({ error: `Tuntematon klubi: ${unknown.join(", ")}` }, { status: 400 });
  if (clubs.length === 0) return NextResponse.json({ error: "Anna vähintään yksi klubi." }, { status: 400 });

  const courseFilter = parseCourseFilter(searchParams.get("course"), clubs);
  if (courseFilter.error) return NextResponse.json({ error: courseFilter.error }, { status: 400 });

  const date = searchParams.get("date");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const min = parseMin(searchParams.get("min"));
  const after = searchParams.get("after");
  const before = searchParams.get("before");
  if (!date && !from) return NextResponse.json({ error: "Anna date tai from(+to)." }, { status: 400 });

  const now = helsinkiNow();
  const selectedCourses = clubs.flatMap((club) =>
    (courseFilter.selected.get(club.id) ?? club.kentat).map((course) => ({ club, course }))
  );
  const widestHorizon = Math.max(...selectedCourses.map(({ course }) => visibleHorizon(course, now.time)));
  const maxRangeDate = addDays(now.date, widestHorizon);

  let dates: string[];
  if (date) {
    dates = [date];
  } else {
    const rangeEnd = to && to < maxRangeDate ? to : maxRangeDate;
    if (from! > rangeEnd) return NextResponse.json({ error: "from on haettavan aikavälin jälkeen." }, { status: 400 });
    dates = [];
    for (let d = from!; d <= rangeEnd; d = addDays(d, 1)) dates.push(d);
  }

  const results: DayGroup[] = await Promise.all(
    dates.map(async (d) => ({
      date: d,
      clubs: await Promise.all(
        selectedCourses.map(({ club, course }) =>
          getCourseDayResult(club, course, d, now.date, now.time, min, after, before)
        )
      ),
    }))
  );

  return NextResponse.json(
    { results },
    { headers: { "Cache-Control": "s-maxage=900, stale-while-revalidate=60" } }
  );
}
