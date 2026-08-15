import type { ClubDayResult } from "./types.ts";

export type WatchMatch = { course: string; time: string; availableSpots: number };

/** The first chronologically available slot wins, making cron matches repeatable. */
export function earliestWatchMatch(days: ClubDayResult[]): WatchMatch | null {
  return days.flatMap((day) => day.status === "ok" ? day.vapaat.map((slot) => ({ course: day.courseName, time: slot.aika, availableSpots: slot.availablePlayers })) : [])
    .sort((left, right) => left.time.localeCompare(right.time) || left.course.localeCompare(right.course, "fi-FI"))[0] ?? null;
}
