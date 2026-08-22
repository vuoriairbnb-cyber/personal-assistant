import assert from "node:assert/strict";
import test from "node:test";
import { detectClub, detectCourse, getClub } from "./clubs.ts";

const kytaja = getClub("kytaja");
const stLaurence = getClub("st-laurence");
const aulanko = getClub("aulanko-golf");

test("Aulanko Eversti uses the normal one-product WiseGolf configuration", () => {
  assert.ok(aulanko);
  assert.equal(aulanko.domain, "api.aulankogolf.fi");
  assert.deepEqual(aulanko.kentat.map(({ id, nimi, productid, resourceId, paikkoja, lahtovaliMin, paivanAlku, paivanLoppu, horisonttiCalendarista, horisonttiAukeaa }) => ({ id, nimi, productid, resourceId, paikkoja, lahtovaliMin, paivanAlku, paivanLoppu, horisonttiCalendarista, horisonttiAukeaa })), [
    { id: "eversti", nimi: "Eversti", productid: 7, resourceId: 1, paikkoja: 4, lahtovaliMin: 10, paivanAlku: "07:00", paivanLoppu: "21:00", horisonttiCalendarista: true, horisonttiAukeaa: "07:00" },
  ]);
  assert.equal(detectClub("Aulanko Golf")?.id, "aulanko-golf");
  assert.equal(detectCourse("Aulanko Eversti", aulanko)?.course.id, "eversti");
});

test("St. Laurence courses are independent WiseGolf products", () => {
  assert.ok(stLaurence);
  assert.equal(stLaurence.domain, "api.stlg.fi");
  assert.deepEqual(stLaurence.kentat.map(({ id, nimi, productid, resourceId, paikkoja, lahtovaliMin, paivanAlku, horisonttiCalendarista, horisonttiAukeaa }) => ({ id, nimi, productid, resourceId, paikkoja, lahtovaliMin, paivanAlku, horisonttiCalendarista, horisonttiAukeaa })), [
    { id: "pyha-lauri", nimi: "Pyhä Lauri", productid: 7, resourceId: 1, paikkoja: 4, lahtovaliMin: 10, paivanAlku: "06:00", horisonttiCalendarista: true, horisonttiAukeaa: "21:00" },
    { id: "kalkki-petteri", nimi: "Kalkki-Petteri", productid: 8, resourceId: 2, paikkoja: 4, lahtovaliMin: 10, paivanAlku: "06:05", horisonttiCalendarista: true, horisonttiAukeaa: "21:00" },
  ]);
  assert.equal(new Set(stLaurence.kentat.map((course) => course.productid)).size, 2);
  assert.equal(detectClub("St. Laurence Golf")?.id, "st-laurence");
  assert.equal(detectCourse("Pyhä Lauri", stLaurence)?.course.id, "pyha-lauri");
  assert.equal(detectCourse("Kalkki Petteri", stLaurence)?.course.id, "kalkki-petteri");
});

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
