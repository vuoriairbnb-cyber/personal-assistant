import assert from "node:assert/strict";
import test from "node:test";
import { normalizeGolfWatchInput } from "./watch-input.ts";

const now = { date: "2026-08-15", time: "10:00" };
const valid = { courses: ["hgk:main"], date: "2026-08-16", players: 2 };

test("golf watch accepts and deterministically normalizes a valid search", () => {
  const watch = normalizeGolfWatchInput({ ...valid, courses: ["hgk:main", "hgk:main"], time_from: " 17:00 ", time_to: "19:00" }, now);
  assert.deepEqual(watch, { courses: ["hgk:main"], searchAllSupported: false, date: "2026-08-16", timeFrom: "17:00", timeTo: "19:00", players: 2, expiresAtTime: "19:00" });
});

test("golf watch rejects invalid player count, missing date and past searches", () => {
  assert.throws(() => normalizeGolfWatchInput({ ...valid, players: 5 }, now), /1–4/);
  assert.throws(() => normalizeGolfWatchInput({ courses: ["hgk:main"] }, now), /Päivä/);
  assert.throws(() => normalizeGolfWatchInput({ ...valid, date: "2026-08-14" }, now), /Menneelle/);
  assert.throws(() => normalizeGolfWatchInput({ ...valid, date: "2026-08-15", time_to: "10:00" }, now), /Menneelle/);
});

test("golf watch handles blank optional times and validates the range", () => {
  const watch = normalizeGolfWatchInput({ ...valid, time_from: " ", time_to: "" }, now);
  assert.equal(watch.timeFrom, null); assert.equal(watch.timeTo, null); assert.equal(watch.expiresAtTime, "23:59");
  assert.throws(() => normalizeGolfWatchInput({ ...valid, time_from: "19:00", time_to: "17:00" }, now), /Loppuaika/);
});
