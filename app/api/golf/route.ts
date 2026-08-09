import { NextResponse, type NextRequest } from "next/server";
import { requireApprovedUser } from "@/lib/auth/guard";
import { DEFAULT_CLUB_ID, getClub, type GolfClubConfig } from "@/lib/golf/clubs";
import { fetchCalendarSettings, fetchReservations } from "@/lib/golf/client";
import { computeFreeSlots } from "@/lib/golf/availability";
import type { GolfSearchResult } from "@/lib/golf/types";

// A club's calendar only opens this many days ahead (16 confirmed for HGK,
// used as the default for any club that doesn't override it). Past it the
// API still returns 200 with an empty `rows` list, which would make every
// slot look free — misleading, so requests past the window are
// rejected/clamped explicitly.
const DEFAULT_MAX_DAYS_AHEAD = 16;
const CACHE_TTL_MS = 15 * 60 * 1000;

const cache = new Map<string, { data: GolfSearchResult; expiresAt: number }>();

function helsinkiToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Helsinki" }).format(new Date());
}

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

async function getDayResult(club: GolfClubConfig, date: string): Promise<GolfSearchResult> {
  const cacheKey = `${club.id}:${date}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  const [reservations, settings] = await Promise.all([
    fetchReservations(club, date),
    fetchCalendarSettings(club, date),
  ]);
  const vapaat = computeFreeSlots(date, settings, reservations.rows);
  const result: GolfSearchResult = { date, yhteensa: vapaat.length, vapaat };
  cache.set(cacheKey, { data: result, expiresAt: Date.now() + CACHE_TTL_MS });
  return result;
}

function filterResult(
  result: GolfSearchResult,
  min: number | null,
  after: string | null,
  before: string | null
): GolfSearchResult {
  const vapaat = result.vapaat.filter((slot) => {
    if (min !== null && slot.vapaita < min) return false;
    if (after && slot.aika < after) return false;
    if (before && slot.aika >= before) return false;
    return true;
  });
  return { ...result, yhteensa: vapaat.length, vapaat };
}

function parseMin(raw: string | null): number | null {
  if (raw === null) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export async function GET(request: NextRequest) {
  try {
    await requireApprovedUser();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kirjaudu sisään.";
    return NextResponse.json({ error: message }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const clubId = searchParams.get("club") ?? DEFAULT_CLUB_ID;
  const club = getClub(clubId);
  if (!club) {
    return NextResponse.json({ error: `Tuntematon klubi: ${clubId}` }, { status: 400 });
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

  const maxDaysAhead = club.maxDaysAhead ?? DEFAULT_MAX_DAYS_AHEAD;
  const maxDate = addDays(helsinkiToday(), maxDaysAhead);
  const cacheHeaders = { "Cache-Control": "s-maxage=900, stale-while-revalidate=60" };

  try {
    if (date) {
      if (date > maxDate) {
        return NextResponse.json(
          {
            error: `${club.nimi}: kalenteri on auki vain ${maxDaysAhead} päivää eteenpäin (viimeistään ${maxDate}).`,
          },
          { status: 400 }
        );
      }
      const result = filterResult(await getDayResult(club, date), min, after, before);
      return NextResponse.json(result, { headers: cacheHeaders });
    }

    const rangeEnd = to && to < maxDate ? to : maxDate;
    if (from! > rangeEnd) {
      return NextResponse.json({ error: "from on haettavan aikavälin jälkeen." }, { status: 400 });
    }

    const dates: string[] = [];
    for (let d = from!; d <= rangeEnd; d = addDays(d, 1)) dates.push(d);

    const results = await Promise.all(
      dates.map(async (d) => filterResult(await getDayResult(club, d), min, after, before))
    );

    return NextResponse.json({ results }, { headers: cacheHeaders });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Golfaikojen haku epäonnistui.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
