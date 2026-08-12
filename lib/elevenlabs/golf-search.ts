import { KLUBIT, type GolfClub, type GolfCourse } from "../golf/clubs.ts";

const MAX_COURSES = 10;
const MAX_RESULTS = 12;
type GolfSearchTarget = { club: GolfClub; course: GolfCourse };

export interface GolfToolQuery { courses?: unknown; search_all_supported?: unknown; date?: unknown; time_from?: unknown; time_to?: unknown; players?: unknown; user_id?: unknown }
export interface NormalizedGolfToolQuery { courses: string[]; searchAllSupported: boolean; date: string; timeFrom: string | null; timeTo: string | null; players: number; userId: string | null }

export class GolfToolError extends Error { readonly status: number; constructor(message: string, status = 400) { super(message); this.status = status; } }

function validDate(value: string): boolean { return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T12:00:00Z`).getTime()) && new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value; }
function validTime(value: string): boolean { return /^([01]\d|2[0-3]):[0-5]\d$/.test(value); }
function normalized(value: string): string { return value.trim().toLocaleLowerCase("fi-FI"); }

export function validateGolfToolQuery(input: unknown): NormalizedGolfToolQuery {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new GolfToolError("Invalid request");
  const body = input as GolfToolQuery;
  const searchAllSupported = body.search_all_supported === true;
  if (body.search_all_supported !== undefined && typeof body.search_all_supported !== "boolean") throw new GolfToolError("Invalid request");
  const rawCourses = body.courses === undefined ? [] : body.courses;
  if (!Array.isArray(rawCourses) || rawCourses.some((course) => typeof course !== "string")) throw new GolfToolError("Invalid request");
  const courseStrings = rawCourses as string[];
  const uniqueCourses = new Map<string, string>();
  courseStrings.forEach((course) => { const trimmed = course.trim(); if (trimmed) uniqueCourses.set(normalized(trimmed), trimmed); });
  const courses = [...uniqueCourses.values()];
  if (courses.length > MAX_COURSES || (!searchAllSupported && courses.length === 0)) throw new GolfToolError("Invalid request");
  if (typeof body.date !== "string" || !validDate(body.date)) throw new GolfToolError("Invalid request");
  const timeFrom = body.time_from === undefined ? null : typeof body.time_from === "string" && validTime(body.time_from) ? body.time_from : null;
  const timeTo = body.time_to === undefined ? null : typeof body.time_to === "string" && validTime(body.time_to) ? body.time_to : null;
  if ((body.time_from !== undefined && !timeFrom) || (body.time_to !== undefined && !timeTo) || (timeFrom && timeTo && timeFrom > timeTo)) throw new GolfToolError("Invalid request");
  const players = body.players === undefined ? 1 : body.players;
  if (typeof players !== "number" || !Number.isInteger(players) || players < 1 || players > 4) throw new GolfToolError("Invalid request");
  return { courses, searchAllSupported, date: body.date, timeFrom, timeTo, players, userId: typeof body.user_id === "string" && body.user_id.length <= 160 ? body.user_id : null };
}

function allTargets(): GolfSearchTarget[] { return KLUBIT.flatMap((club) => club.kentat.map((course) => ({ club, course }))); }
function courseMatches(course: GolfCourse, club: GolfClub, value: string): boolean {
  const wanted = normalized(value);
  return [course.nimi, course.id, ...(course.aliases ?? []), club.nimi, ...club.aliases].some((alias) => normalized(alias) === wanted);
}

export function resolveGolfCourses(query: NormalizedGolfToolQuery) {
  const all = allTargets();
  if (query.searchAllSupported) return { targets: all, supportedCourses: all.map(({ course }) => course.nimi), unsupportedCourses: [] as string[] };
  const targets: GolfSearchTarget[] = [];
  const unsupportedCourses: string[] = [];
  for (const requested of query.courses) {
    const matches = all.filter(({ club, course }) => courseMatches(course, club, requested));
    if (matches.length) matches.forEach((match) => { if (!targets.some((current) => current.club.id === match.club.id && current.course.id === match.course.id)) targets.push(match); });
    else unsupportedCourses.push(requested);
  }
  return { targets, supportedCourses: targets.map(({ course }) => course.nimi), unsupportedCourses };
}

export async function runGolfToolSearch(query: NormalizedGolfToolQuery) {
  const resolved = resolveGolfCourses(query);
  const { searchCourseDay } = await import("../golf/search.ts");
  const days = await Promise.all(resolved.targets.map((target) => searchCourseDay(target, query.date, { min: query.players, after: query.timeFrom, before: query.timeTo })));
  if (resolved.targets.length > 0 && days.every((day) => day.status === "virhe")) throw new GolfToolError("Golf search failed", 502);
  const results = days.flatMap((day) => day.status === "ok" ? day.vapaat.map((slot) => ({ course: day.courseName, date: query.date, time: slot.aika, available_spots: slot.availablePlayers })) : [])
    .sort((left, right) => left.time.localeCompare(right.time) || left.course.localeCompare(right.course)).slice(0, MAX_RESULTS);
  return { ok: true as const, query: { courses: query.courses, search_all_supported: query.searchAllSupported, date: query.date, time_from: query.timeFrom, time_to: query.timeTo, players: query.players }, supported_courses: resolved.supportedCourses, unsupported_courses: resolved.unsupportedCourses, admin_attention: resolved.unsupportedCourses.length > 0, count: results.length, results };
}
