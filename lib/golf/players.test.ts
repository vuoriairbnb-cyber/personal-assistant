import assert from "node:assert/strict";
import test from "node:test";
import { getClub } from "./clubs.ts";
import { courseForExtractedPlayer, extractPublicPlayers, normalizePlayerName } from "./players.ts";

test("player watch normalization uses exact NFC, whitespace and Finnish case normalization", () => {
  assert.equal(normalizePlayerName("  Mätti   MEIKÄLÄINEN "), "mätti meikäläinen");
});

test("player watch extraction accepts only public active names and omits identifiers", () => {
  const players = extractPublicPlayers([
    { firstName: "Matti", familyName: "Meikäläinen", namePublic: 1, status: "active", dateTimeStart: "2026-08-23 10:20:00", resourceId: "49", playerId: "must-not-leak" },
    { firstName: "Hidden", familyName: "Player", namePublic: 0, status: "active", dateTimeStart: "2026-08-23 11:00:00" },
  ]);
  assert.deepEqual(players, [{ displayName: "Matti Meikäläinen", normalizedName: "matti meikäläinen", date: "2026-08-23", time: "10:20", resourceId: 49 }]);
});

test("shared product resource IDs are resolved to the matching course", () => {
  const nordcenter = getClub("nordcenter")!;
  assert.equal(courseForExtractedPlayer(nordcenter.kentat, 49)?.id, "benz");
  assert.equal(courseForExtractedPlayer(nordcenter.kentat, 51)?.id, "fream");
  assert.equal(courseForExtractedPlayer(nordcenter.kentat), null);
});
