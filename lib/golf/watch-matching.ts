import type { ClubDayResult } from "./types.ts";

export type WatchMatch = { course: string; time: string; availableSpots: number };

/** Watches only match tee times that are both free and currently bookable. */
export function bookableWatchMatches(days: ClubDayResult[]): WatchMatch[] {
  return days.flatMap((day) => day.status === "ok" ? day.vapaat
    .filter((slot) => slot.bookableNow)
    .map((slot) => ({ course: day.courseName, time: slot.aika, availableSpots: slot.availablePlayers })) : [])
    .sort((left, right) => left.course.localeCompare(right.course, "fi-FI") || left.time.localeCompare(right.time));
}

/** Backwards-compatible convenience for callers needing the deterministic first match. */
export function earliestWatchMatch(days: ClubDayResult[]): WatchMatch | null {
  return bookableWatchMatches(days)[0] ?? null;
}
