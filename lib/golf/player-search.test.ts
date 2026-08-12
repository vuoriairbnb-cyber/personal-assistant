import assert from "node:assert/strict";
import test from "node:test";
import { matchesPublicGolfPlayer, parsePublicGolfPlayer, parseWiseGolfLocalDateTime } from "./player-parser.ts";
import { validatePlayerSearchRequest } from "./player-search-request.ts";

const publicPlayer = { firstName: "Matti", familyName: "Meikäläinen", namePublic: 1, status: "active", dateTimeStart: "2026-08-13T14:20:00", personId: 1, playerId: "secret", handicapActive: 12 };

test("only active public players with names are parsed and sensitive fields are omitted", () => {
  const player = parsePublicGolfPlayer(publicPlayer);
  assert.deepEqual(player, { firstName: "Matti", familyName: "Meikäläinen", dateTimeStart: "2026-08-13T14:20:00" });
  assert.equal(parsePublicGolfPlayer({ ...publicPlayer, namePublic: 0 }), null);
  assert.equal(parsePublicGolfPlayer({ ...publicPlayer, firstName: "" }), null);
  assert.equal(parsePublicGolfPlayer({ ...publicPlayer, status: "inactive" }), null);
});

test("public player matching is exact and normalizes case and whitespace", () => {
  const player = parsePublicGolfPlayer(publicPlayer)!;
  assert.equal(matchesPublicGolfPlayer(player, " matti ", "MEIKÄLÄINEN"), true);
  assert.equal(matchesPublicGolfPlayer(player, "Matti", "Mallinen"), false);
});

test("WiseGolf local datetimes retain their supplied date and clock time", () => {
  assert.deepEqual(parseWiseGolfLocalDateTime("2026-08-14 10:30:00"), { date: "2026-08-14", time: "10:30" });
  assert.equal(parseWiseGolfLocalDateTime("not-a-datetime"), null);
});

test("player search rejects date ranges longer than 31 days", () => {
  assert.throws(() => validatePlayerSearchRequest({ firstName: "Matti", familyName: "Meikäläinen", clubs: ["hgk"], dateFrom: "2026-08-01", dateTo: "2026-09-01" }), /Invalid request/);
});
