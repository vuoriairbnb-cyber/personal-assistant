import assert from "node:assert/strict";
import test from "node:test";
import { resolveGolfCourses, validateGolfToolQuery } from "./golf-search.ts";

const base = { date: "2026-08-14", players: 2 };

test("golf tool validates bounded one-day requests", () => {
  assert.throws(() => validateGolfToolQuery({ ...base }), /Invalid request/);
  assert.throws(() => validateGolfToolQuery({ ...base, courses: ["HGK"], players: 5 }), /Invalid request/);
  assert.throws(() => validateGolfToolQuery({ ...base, courses: ["HGK"], date: "2026-02-30" }), /Invalid request/);
  assert.throws(() => validateGolfToolQuery({ ...base, courses: ["HGK"], time_from: "17:00", time_to: "16:00" }), /Invalid request/);
  assert.throws(() => validateGolfToolQuery({ ...base, courses: Array.from({ length: 11 }, (_, index) => `course ${index}`) }), /Invalid request/);
  assert.deepEqual(validateGolfToolQuery({ ...base, courses: [" HGK ", "hgk"], time_from: "15:00", time_to: "16:00" }), { courses: ["hgk"], searchAllSupported: false, date: "2026-08-14", timeFrom: "15:00", timeTo: "16:00", players: 2, userId: null });
});

test("golf tool resolves supported and unsupported courses deterministically", () => {
  const partial = resolveGolfCourses(validateGolfToolQuery({ ...base, courses: ["HGK", "Peuramaa"] }));
  assert.deepEqual(partial.supportedCourses, ["Helsingin Golfklubi"]);
  assert.deepEqual(partial.unsupportedCourses, ["Peuramaa"]);
  const all = resolveGolfCourses(validateGolfToolQuery({ ...base, search_all_supported: true }));
  assert.ok(all.targets.length > 10);
  assert.deepEqual(all.unsupportedCourses, []);
});
