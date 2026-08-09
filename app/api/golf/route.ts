import { NextResponse, type NextRequest } from "next/server";
import { requireApprovedUser } from "@/lib/auth/guard";
import {
  DEFAULT_CLUB_ID,
  effectiveHorizon,
  getClub,
  isInSeason,
  type GolfClubConfig,
} from "@/lib/golf/clubs";
import { fetchCalendarSettings, fetchReservations } from "@/lib/golf/client";
import { computeFreeSlots } from "@/lib/golf/availability";
import type { ClubDayResult, DayGroup, FreeSlot } from "@/lib/golf/types";

const CACHE_TTL_MS = 15 * 60 * 1000;

// Raw (unfiltered) per-club-per-day slot list — shared across every min/
// after/before variation of a request, keyed by club so clubs never collide.
const cache = new Map<string, { vapaat: FreeSlot[]; expiresAt: number }>();

function helsinkiToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Helsinki" }).format(new Date());
}

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

async function getRawVapaat(club: GolfClubConfig, date: string): Promise<FreeSlot[]> {
  const cacheKey = `${club.id}:${date}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.vapaat;

  const [reservations, settings] = await Promise.all([
    fetchReservations(club, date),
    fetchCalendarSettings(club, date),
  ]);
  const vapaat = computeFreeSlots(date, settings, reservations.rows);
  cache.set(cacheKey, { vapaat, expiresAt: Date.now() + CACHE_TTL_MS });
  return vapaat;
}

function filterSlots(
  vapaat: FreeSlot[],
  min: number | null,
  after: string | null,
  before: string | null
): FreeSlot[] {
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

/**
 * One club's result for one day. Season/horizon are checked *before* ever
 * calling the club's API — a closed-season or out-of-range request never
 * generates a request, per CLAUDE-golf.md's "don't call the API for dates
 * the calendar can't answer for" guidance. A real fetch failure is caught
 * here too, so one club's outage never takes down a multi-club search.
 */
async function getClubDayResult(
  club: GolfClubConfig,
  date: string,
  today: string,
  min: number | null,
  after: string | null,
  before: string | null
): Promise<ClubDayResult> {
  if (!isInSeason(club, date)) {
    return { club: club.id, nimi: club.nimi, status: "kausi_kiinni", vapaat: [] };
  }

  const horisonttiPaivia = effectiveHorizon(club);
  const maxDate = addDays(today, horisonttiPaivia);
  if (date > maxDate) {
    return {
      club: club.id,
      nimi: club.nimi,
      status: "liian_kaukana",
      vapaat: [],
      horisonttiPaivia,
    };
  }

  try {
    const raw = await getRawVapaat(club, date);
    return { club: club.id, nimi: club.nimi, status: "ok", vapaat: filterSlots(raw, min, after, before) };
  } catch {
    return { club: club.id, nimi: club.nimi, status: "virhe", vapaat: [] };
  }
}

function parseClubs(raw: string): { clubs: GolfClubConfig[]; unknown: string[] } {
  const ids = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const clubs: GolfClubConfig[] = [];
  const unknown: string[] = [];
  for (const id of ids) {
    const club = getClub(id);
    if (club) clubs.push(club);
    else unknown.push(id);
  }
  return { clubs, unknown };
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
  if (unknown.length > 0) {
    return NextResponse.json({ error: `Tuntematon klubi: ${unknown.join(", ")}` }, { status: 400 });
  }
  if (clubs.length === 0) {
    return NextResponse.json({ error: "Anna vähintään yksi klubi." }, { status: 400 });
  }

  const date = searchParams.get("date");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const min = parseMin(searchParams.get("min"));
  const after = searchParams.get("after");
  const before = searchParams.get("before");

  if (!date && !from) {
    return NextResponse.json({ error: "Anna date tai from(+to)." }, { status: 400 });
  }

  const today = helsinkiToday();

  // A date-range spans however far out the *widest* selected club reaches —
  // a narrower club still shows "liian_kaukana" per day within that range,
  // it just doesn't cut the range short for everyone else.
  const widestHorizon = Math.max(...clubs.map(effectiveHorizon));
  const maxRangeDate = addDays(today, widestHorizon);

  let dates: string[];
  if (date) {
    dates = [date];
  } else {
    const rangeEnd = to && to < maxRangeDate ? to : maxRangeDate;
    if (from! > rangeEnd) {
      return NextResponse.json({ error: "from on haettavan aikavälin jälkeen." }, { status: 400 });
    }
    dates = [];
    for (let d = from!; d <= rangeEnd; d = addDays(d, 1)) dates.push(d);
  }

  const results: DayGroup[] = await Promise.all(
    dates.map(async (d) => ({
      date: d,
      clubs: await Promise.all(
        clubs.map((club) => getClubDayResult(club, d, today, min, after, before))
      ),
    }))
  );

  return NextResponse.json(
    { results },
    { headers: { "Cache-Control": "s-maxage=900, stale-while-revalidate=60" } }
  );
}
