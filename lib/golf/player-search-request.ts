import { getClub, type GolfClub, type GolfCourse } from "./clubs.ts";

const MAX_RANGE_DAYS = 31;
export function playerSearchProducts(club: GolfClub): { productid: number; courses: GolfCourse[] }[] {
  const groups = new Map<number, GolfCourse[]>();
  for (const course of club.kentat) groups.set(course.productid, [...(groups.get(course.productid) ?? []), course]);
  return [...groups.entries()].map(([productid, courses]) => ({ productid, courses }));
}
function validDate(value: unknown): value is string { return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T12:00:00Z`).getTime()) && new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value; }
function addDays(date: string, days: number): string { const value = new Date(`${date}T12:00:00Z`); value.setUTCDate(value.getUTCDate() + days); return value.toISOString().slice(0, 10); }

export function validatePlayerSearchRequest(value: unknown): { firstName: string; familyName: string; clubs: GolfClub[]; dates: string[] } {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid request");
  const body = value as Record<string, unknown>;
  if (typeof body.firstName !== "string" || !body.firstName.trim() || typeof body.familyName !== "string" || !body.familyName.trim() || !Array.isArray(body.clubs) || !validDate(body.dateFrom) || !validDate(body.dateTo) || body.dateTo < body.dateFrom || body.dateTo > addDays(body.dateFrom, MAX_RANGE_DAYS - 1)) throw new Error("Invalid request");
  const clubs: GolfClub[] = [];
  for (const id of body.clubs) { if (typeof id !== "string") throw new Error("Invalid request"); const club = getClub(id); if (!club?.playerSearch?.enabled || clubs.some((item) => item.id === club.id)) throw new Error("Invalid request"); clubs.push(club); }
  if (!clubs.length) throw new Error("Invalid request");
  const dates: string[] = [];
  for (let date = body.dateFrom; date <= body.dateTo; date = addDays(date, 1)) dates.push(date);
  return { firstName: body.firstName, familyName: body.familyName, clubs, dates };
}
