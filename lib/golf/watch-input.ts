import { getClub, getCourse } from "./clubs.ts";

export const MAX_WATCH_COURSES = 10;
const DEFAULT_EXPIRY_TIME = "23:59";
export type HelsinkiClock = { date: string; time: string };
export type NormalizedWatchInput = { courses: string[]; searchAllSupported: boolean; date: string; timeFrom: string | null; timeTo: string | null; players: number; expiresAtTime: string };

export class WatchInputError extends Error { constructor(message: string) { super(message); } }
function validDate(value: string) { return /^\d{4}-\d{2}-\d{2}$/.test(value) && new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value; }
function optionalTime(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") throw new WatchInputError("Virheellinen kellonaika.");
  const time = value.trim();
  if (!time) return null;
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new WatchInputError("Virheellinen kellonaika.");
  return time;
}
function normalizeCourses(raw: unknown, searchAllSupported: boolean): string[] {
  const list = raw === undefined ? [] : raw;
  if (!Array.isArray(list) || list.some((value) => typeof value !== "string")) throw new WatchInputError("Virheelliset kentät.");
  const unique = new Set<string>();
  for (const value of list) {
    const [clubId, courseId, extra] = value.trim().split(":");
    const club = clubId ? getClub(clubId) : undefined;
    const course = club && courseId && !extra ? getCourse(club, courseId) : undefined;
    if (!club || !course) throw new WatchInputError("Tuntematon golfkenttä.");
    unique.add(`${club.id}:${course.id}`);
  }
  const courses = [...unique].sort((left, right) => left.localeCompare(right, "fi-FI"));
  if (courses.length > MAX_WATCH_COURSES || (!searchAllSupported && courses.length === 0)) throw new WatchInputError("Valitse vähintään yksi kenttä.");
  return courses;
}

export function normalizeGolfWatchInput(input: unknown, now: HelsinkiClock): NormalizedWatchInput {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new WatchInputError("Virheellinen vahti.");
  const body = input as Record<string, unknown>;
  const searchAllSupported = body.search_all_supported === true;
  if (body.search_all_supported !== undefined && typeof body.search_all_supported !== "boolean") throw new WatchInputError("Virheellinen vahti.");
  if (typeof body.date !== "string" || !validDate(body.date)) throw new WatchInputError("Päivä on pakollinen.");
  const timeFrom = optionalTime(body.time_from);
  const timeTo = optionalTime(body.time_to);
  if (timeFrom && timeTo && timeFrom > timeTo) throw new WatchInputError("Loppuaika ei voi olla ennen alkuaikaa.");
  const players = body.players === undefined ? 1 : body.players;
  if (typeof players !== "number" || !Number.isInteger(players) || players < 1 || players > 4) throw new WatchInputError("Pelaajamäärän on oltava 1–4.");
  const expiresAtTime = timeTo ?? DEFAULT_EXPIRY_TIME;
  if (body.date < now.date || (body.date === now.date && expiresAtTime <= now.time)) throw new WatchInputError("Menneelle ajalle ei voi luoda vahtia.");
  return { courses: normalizeCourses(body.courses, searchAllSupported), searchAllSupported, date: body.date, timeFrom, timeTo, players, expiresAtTime };
}
