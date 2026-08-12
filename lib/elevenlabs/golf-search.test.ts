import assert from "node:assert/strict";
import test from "node:test";
import { resolveGolfCourses, summarizeCourseAvailability, validateGolfToolQuery } from "./golf-search.ts";

const base = { date: "2026-08-14", players: 2 };

test("golf tool validates bounded one-day requests", () => {
  assert.throws(() => validateGolfToolQuery({ ...base }), /Invalid request/);
  assert.throws(() => validateGolfToolQuery({ ...base, courses: ["HGK"], players: 5 }), /Invalid request/);
  assert.throws(() => validateGolfToolQuery({ ...base, courses: ["HGK"], date: "2026-02-30" }), /Invalid request/);
  assert.throws(() => validateGolfToolQuery({ ...base, courses: ["HGK"], time_from: "17:00", time_to: "16:00" }), /Invalid request/);
  assert.throws(() => validateGolfToolQuery({ ...base, courses: Array.from({ length: 11 }, (_, index) => `course ${index}`) }), /Invalid request/);
  assert.deepEqual(validateGolfToolQuery({ ...base, courses: [" HGK ", "hgk"], time_from: "15:00", time_to: "16:00" }), { courses: ["hgk"], searchAllSupported: false, date: "2026-08-14", timeFrom: "15:00", timeTo: "16:00", players: 2, userId: null });
});

test("golf tool normalizes empty optional time fields", () => {
  const request = (times: Record<string, string>) => validateGolfToolQuery({ ...base, courses: ["HGK"], ...times });
  assert.deepEqual(request({ time_from: "16:00", time_to: "" }).timeFrom, "16:00");
  assert.equal(request({ time_from: "16:00", time_to: "" }).timeTo, null);
  assert.equal(request({ time_from: "", time_to: "17:00" }).timeFrom, null);
  assert.equal(request({ time_from: "", time_to: "17:00" }).timeTo, "17:00");
  assert.deepEqual(request({ time_from: "  ", time_to: "\t" }).timeFrom, null);
  assert.deepEqual(request({ time_from: "  ", time_to: "\t" }).timeTo, null);
  assert.throws(() => request({ time_from: "foo", time_to: "" }), /Invalid request/);
});

test("golf tool resolves supported and unsupported courses deterministically", () => {
  const partial = resolveGolfCourses(validateGolfToolQuery({ ...base, courses: ["HGK", "Peuramaa"] }));
  assert.deepEqual(partial.supportedCourses, ["Helsingin Golfklubi"]);
  assert.deepEqual(partial.unsupportedCourses, ["Peuramaa"]);
  const all = resolveGolfCourses(validateGolfToolQuery({ ...base, search_all_supported: true }));
  assert.ok(all.targets.length > 10);
  assert.deepEqual(all.unsupportedCourses, []);
});

test("course summaries retain every matching course before results are capped", () => {
  const day = (courseName: string, times: string[]) => ({ club: courseName, nimi: courseName, clubId: courseName, clubName: courseName, courseId: courseName, courseName, courseCount: 1, status: "ok" as const, vapaat: times.map((aika, index) => ({ aika, vapaita: index % 2 ? 4 : 2, availablePlayers: index % 2 ? 4 : 2, bookableNow: true })) });
  const { allResults, courseSummaries } = summarizeCourseAvailability([
    day("Alpha", Array.from({ length: 12 }, (_, index) => `0${Math.floor(index / 6) + 6}:${String((index % 6) * 9).padStart(2, "0")}`)),
    day("Bravo", ["09:30", "09:39"]),
    day("Charlie", ["09:48"]),
  ]);
  const results = allResults.sort((left, right) => left.time.localeCompare(right.time) || left.course.localeCompare(right.course)).slice(0, 12);
  assert.equal(results.length, 12);
  assert.deepEqual(new Set(results.map((result) => result.course)), new Set(["Alpha"]));
  assert.deepEqual(courseSummaries, [
    { course: "Alpha", matching_times: 12, first_time: "06:00", last_time: "07:45", max_available_spots: 4 },
    { course: "Bravo", matching_times: 2, first_time: "09:30", last_time: "09:39", max_available_spots: 4 },
    { course: "Charlie", matching_times: 1, first_time: "09:48", last_time: "09:48", max_available_spots: 2 },
  ]);
});
