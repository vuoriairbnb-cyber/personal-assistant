import assert from "node:assert/strict";
import test from "node:test";
import { detectClub, detectCourse, getClub } from "./clubs.ts";

const kytaja = getClub("kytaja");

test("Kytäjä club and course aliases resolve to the configured courses", () => {
  assert.ok(kytaja);
  assert.equal(kytaja.kentat.length, 2);
  assert.deepEqual(
    kytaja.kentat.map(({ id, productid, resourceId, paikkoja, paivanAlku, paivanLoppu, horisonttiCalendarista, horisonttiAukeaa }) => ({
      id, productid, resourceId, paikkoja, paivanAlku, paivanLoppu, horisonttiCalendarista, horisonttiAukeaa,
    })),
    [
      { id: "north-west", productid: 22, resourceId: 1, paikkoja: 4, paivanAlku: "07:05", paivanLoppu: "20:05", horisonttiCalendarista: true, horisonttiAukeaa: undefined },
      { id: "south-east", productid: 70, resourceId: 2, paikkoja: 4, paivanAlku: "07:00", paivanLoppu: "20:00", horisonttiCalendarista: true, horisonttiAukeaa: undefined },
    ]
  );

  for (const query of ["Kytäjä", "Kytäjä Golf", "Kytaja", "Kytaja Golf"]) {
    assert.equal(detectClub(query)?.id, "kytaja");
  }
  for (const query of ["Kytäjä NW", "North West", "Kytaja North West"]) {
    assert.equal(detectCourse(query, detectClub(query))?.course.id, "north-west");
  }
  for (const query of ["Kytäjä SE", "South East", "Kytaja South East"]) {
    assert.equal(detectCourse(query, detectClub(query))?.course.id, "south-east");
  }
});
