import "server-only";
import { fetchReservations } from "./client.ts";
import { type GolfClub, type GolfCourse } from "./clubs.ts";
import { matchesPublicGolfPlayer, parsePublicGolfPlayer } from "./player-parser.ts";
import { validatePlayerSearchRequest } from "./player-search-request.ts";

const CONCURRENCY = 5;

export type PlayerSearchResult = { clubId: string; clubName: string; courseId: string; courseName: string; date: string; time: string; dateTimeStart: string };
export type PlayerSearchResponse = { results: PlayerSearchResult[]; partialFailures: { clubId: string; date: string }[] };

export { matchesPublicGolfPlayer, parsePublicGolfPlayer, type PublicGolfPlayer } from "./player-parser.ts";

export { validatePlayerSearchRequest } from "./player-search-request.ts";

function courseForPlayer(club: GolfClub, resourceId?: number): GolfCourse | null {
  if (resourceId !== undefined) return club.kentat.find((course) => course.resourceId === resourceId) ?? (club.kentat.length === 1 ? club.kentat[0]! : null);
  return club.kentat.length === 1 ? club.kentat[0]! : null;
}

export async function searchPublicPlayers(input: ReturnType<typeof validatePlayerSearchRequest>): Promise<PlayerSearchResponse> {
  const work = input.clubs.flatMap((club) => input.dates.map((date) => ({ club, date })));
  const results: PlayerSearchResult[] = [];
  const partialFailures: { clubId: string; date: string }[] = [];
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, work.length) }, async () => {
    while (next < work.length) {
      const current = work[next++]!;
      try {
        const responses = await Promise.all(current.club.kentat.map((course) => fetchReservations(current.club, course.productid, current.date)));
        for (const response of responses) {
          const rows = Array.isArray(response.reservationsGolfPlayers) ? response.reservationsGolfPlayers : [];
          for (const raw of rows) {
            const player = parsePublicGolfPlayer(raw);
            if (!player || !matchesPublicGolfPlayer(player, input.firstName, input.familyName)) continue;
            const course = courseForPlayer(current.club, player.resourceId);
            if (!course) continue;
            const dateTimeStart = player.dateTimeStart;
            results.push({ clubId: current.club.id, clubName: current.club.nimi, courseId: course.id, courseName: course.nimi, date: dateTimeStart.slice(0, 10), time: dateTimeStart.slice(11, 16), dateTimeStart });
          }
        }
      } catch { partialFailures.push({ clubId: current.club.id, date: current.date }); }
    }
  }));
  const unique = new Map<string, PlayerSearchResult>();
  results.forEach((result) => unique.set(`${result.clubId}:${result.courseId}:${result.dateTimeStart}`, result));
  return { results: [...unique.values()].sort((a, b) => a.dateTimeStart.localeCompare(b.dateTimeStart) || a.clubId.localeCompare(b.clubId)), partialFailures };
}
