import assert from "node:assert/strict";
import test from "node:test";
import { matchesPublicGolfPlayer, parsePublicGolfPlayer, parseWiseGolfLocalDateTime } from "./player-parser.ts";
import { validatePlayerSearchRequest } from "./player-search-request.ts";
import { playerSearchProducts } from "./player-search-request.ts";
import { getClub } from "./clubs.ts";

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

test("Nordcenter shares one product fetch and splits numeric resource IDs by course", () => {
  const nordcenter = getClub("nordcenter")!;
  assert.deepEqual(playerSearchProducts(nordcenter).map((group) => ({ productid: group.productid, courses: group.courses.map((course) => course.id) })), [{ productid: 462, courses: ["benz", "fream"] }]);
  assert.equal(parsePublicGolfPlayer({ ...publicPlayer, resourceId: "49" })?.resourceId, 49);
  assert.equal(parsePublicGolfPlayer({ ...publicPlayer, resourceId: "51" })?.resourceId, 51);
});

test("Aulanko Eversti is configured as one authenticated player-search course", () => {
  const aulanko = getClub("aulanko-golf")!;
  assert.equal(aulanko.domain, "api.aulankogolf.fi");
  assert.equal(aulanko.playerSearch?.enabled, true);
  assert.deepEqual(playerSearchProducts(aulanko).map((group) => ({ productid: group.productid, courses: group.courses.map((course) => ({ id: course.id, resourceId: course.resourceId })) })), [{ productid: 7, courses: [{ id: "eversti", resourceId: 1 }] }]);
  assert.equal(parsePublicGolfPlayer({ ...publicPlayer, resourceId: "1" })?.resourceId, 1);
});

test("St. Laurence keeps Pyhä Lauri and Kalkki-Petteri as separate player-search products", () => {
  const stLaurence = getClub("st-laurence")!;
  assert.equal(stLaurence.domain, "api.stlg.fi");
  assert.equal(stLaurence.playerSearch?.enabled, true);
  assert.deepEqual(playerSearchProducts(stLaurence).map((group) => ({ productid: group.productid, courses: group.courses.map((course) => ({ id: course.id, resourceId: course.resourceId })) })), [
    { productid: 7, courses: [{ id: "pyha-lauri", resourceId: 1 }] },
    { productid: 8, courses: [{ id: "kalkki-petteri", resourceId: 2 }] },
  ]);
  assert.equal(parsePublicGolfPlayer({ ...publicPlayer, resourceId: "1" })?.resourceId, 1);
  assert.equal(parsePublicGolfPlayer({ ...publicPlayer, resourceId: "2" })?.resourceId, 2);
});
