import assert from "node:assert/strict";
import test from "node:test";
import { earliestWatchMatch } from "./watch-matching.ts";

const day = (courseName: string, status: "ok" | "virhe", times: [string, number][] = []) => ({
  club: courseName, nimi: courseName, clubId: courseName, clubName: courseName, courseId: courseName,
  courseName, courseCount: 1, status, vapaat: times.map(([aika, availablePlayers]) => ({ aika, vapaita: availablePlayers, availablePlayers, bookableNow: true })),
});

test("a watch match chooses the earliest matching slot deterministically", () => {
  assert.deepEqual(earliestWatchMatch([day("Beta", "ok", [["17:33", 4]]), day("Alpha", "ok", [["17:33", 2], ["17:23", 3]])]), { course: "Alpha", time: "17:23", availableSpots: 3 });
});

test("provider failures and empty results never produce a false match", () => {
  assert.equal(earliestWatchMatch([day("Alpha", "virhe"), day("Beta", "ok")]), null);
});
