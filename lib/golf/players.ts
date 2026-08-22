import { parsePublicGolfPlayer, parseWiseGolfLocalDateTime } from "./player-parser.ts";
import type { GolfCourse } from "./clubs.ts";

export type ExtractedPublicPlayer = { displayName: string; normalizedName: string; date: string; time: string; resourceId?: number };
export function normalizePlayerName(value: string) { return value.normalize("NFC").trim().replace(/\s+/g, " ").toLocaleLowerCase("fi-FI"); }
export function extractPublicPlayers(rows: unknown[]): ExtractedPublicPlayer[] {
  return rows.flatMap((row) => {
    const player = parsePublicGolfPlayer(row); const local = player && parseWiseGolfLocalDateTime(player.dateTimeStart);
    return player && local ? [{ displayName: `${player.firstName.trim()} ${player.familyName.trim()}`, normalizedName: normalizePlayerName(`${player.firstName} ${player.familyName}`), date: local.date, time: local.time, ...(player.resourceId !== undefined ? { resourceId: player.resourceId } : {}) }] : [];
  });
}
export function courseForExtractedPlayer(courses: GolfCourse[], resourceId?: number) {
  return resourceId !== undefined ? courses.find((course) => Number(course.resourceId) === Number(resourceId)) ?? (courses.length === 1 ? courses[0] : null) : courses.length === 1 ? courses[0] : null;
}
