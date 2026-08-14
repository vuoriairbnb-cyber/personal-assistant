import "server-only";
import { fetchAuthenticatedReservations, WiseGolfAuthRequiredError } from "./client.ts";
import { type GolfCourse } from "./clubs.ts";
import { matchesPublicGolfPlayer, parsePublicGolfPlayer, parseWiseGolfLocalDateTime } from "./player-parser.ts";
import { playerSearchProducts, validatePlayerSearchRequest } from "./player-search-request.ts";

const CONCURRENCY = 5;

export type PlayerSearchResult = { clubId: string; clubName: string; courseId: string; courseName: string; date: string; time: string; dateTimeStart: string };
export type PlayerSearchResponse = { results: PlayerSearchResult[]; partialFailures: { clubId: string; date: string }[] };

export { matchesPublicGolfPlayer, parsePublicGolfPlayer, type PublicGolfPlayer } from "./player-parser.ts";

export { validatePlayerSearchRequest } from "./player-search-request.ts";

function courseForPlayer(courses: GolfCourse[], resourceId?: number): GolfCourse | null {
  if (resourceId !== undefined) return courses.find((course) => course.resourceId === resourceId) ?? (courses.length === 1 ? courses[0]! : null);
  return courses.length === 1 ? courses[0]! : null;
}

export async function searchPublicPlayers(input: ReturnType<typeof validatePlayerSearchRequest>): Promise<PlayerSearchResponse> {
  const work = input.clubs.flatMap((club) => input.dates.map((date) => ({ club, date })));
  const results: PlayerSearchResult[] = [];
  const partialFailures: { clubId: string; date: string }[] = [];
  let authFailures = 0;
  let successfulFetches = 0;
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, work.length) }, async () => {
    while (next < work.length) {
      const current = work[next++]!;
      try {
        const responses = await Promise.all(playerSearchProducts(current.club).map(async ({ productid, courses }) => ({ courses, response: await fetchAuthenticatedReservations(current.club, productid, current.date) })));
        successfulFetches += 1;
        for (const { courses, response } of responses) {
          const rows = Array.isArray(response.reservationsGolfPlayers) ? response.reservationsGolfPlayers : [];
          for (const raw of rows) {
            const player = parsePublicGolfPlayer(raw);
            if (!player || !matchesPublicGolfPlayer(player, input.firstName, input.familyName)) continue;
            const course = courseForPlayer(courses, player.resourceId);
            if (!course) continue;
            const dateTimeStart = player.dateTimeStart;
            const localTime = parseWiseGolfLocalDateTime(dateTimeStart);
            if (!localTime) continue;
            results.push({ clubId: current.club.id, clubName: current.club.nimi, courseId: course.id, courseName: course.nimi, date: localTime.date, time: localTime.time, dateTimeStart });
          }
        }
      } catch (error) {
        if (error instanceof WiseGolfAuthRequiredError) authFailures += 1;
        partialFailures.push({ clubId: current.club.id, date: current.date });
      }
    }
  }));
  if (authFailures > 0 && successfulFetches === 0) throw new WiseGolfAuthRequiredError("WiseGolf authentication is required");
  const unique = new Map<string, PlayerSearchResult>();
  results.forEach((result) => unique.set(`${result.clubId}:${result.courseId}:${result.dateTimeStart}`, result));
  return { results: [...unique.values()].sort((a, b) => a.dateTimeStart.localeCompare(b.dateTimeStart) || a.clubId.localeCompare(b.clubId)), partialFailures };
}
