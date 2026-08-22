import assert from "node:assert/strict";
import test from "node:test";
import { computeFreeSlots, getCalendarVisibility } from "./availability.ts";
import type { CalendarSettingsResponse, ReservationRow } from "./types.ts";

const date = "2026-08-11";

const settings: CalendarSettingsResponse = {
  success: true,
  reservationSettings: {
    startTime: "08:00:00",
    endTime: "18:10:00",
    duration: 10,
    breakTime: 0,
    resources: [
      { resourceId: 49, quantity: 4 },
      { resourceId: 51, quantity: 4 },
      { resourceId: 1, quantity: 4 },
      { resourceId: 2, quantity: 4 },
    ],
  },
  resourceRules: [],
};

function row(time: string, resourceId: number | string, quantity = 1, status = 2): ReservationRow {
  return {
    start: `${date} ${time}:00`,
    end: `${date} ${time}:00`,
    status,
    quantity,
    resources: [{ resourceId, quantity }],
  };
}

function availability(rows: ReservationRow[], resourceId: number, time: string): number | undefined {
  return computeFreeSlots(date, settings, rows, new Date("2026-08-01T00:00:00Z"), resourceId)
    .find((slot) => slot.aika === time)?.availablePlayers;
}

test("Nordcenter sums only the requested row.resources quantity", () => {
  const rows = [
    row("08:00", "49"),
    ...Array.from({ length: 2 }, () => row("08:00", 49)),
    ...Array.from({ length: 2 }, () => row("08:00", 51)),
    ...Array.from({ length: 4 }, () => row("09:40", 49)),
    ...Array.from({ length: 4 }, () => row("11:00", 49)),
    ...Array.from({ length: 3 }, () => row("11:00", 51)),
    row("10:10", 51, 1, 2),
    ...Array.from({ length: 3 }, () => row("10:10", 51, 1, 4)),
    ...Array.from({ length: 4 }, () => row("15:00", 49, 1, 4)),
    ...Array.from({ length: 4 }, () => row("16:40", 51)),
    ...Array.from({ length: 4 }, () => row("18:00", 51)),
  ];

  assert.equal(availability(rows, 49, "08:00"), 1);
  assert.equal(availability(rows, 51, "08:00"), 2);
  assert.equal(availability(rows, 49, "09:40"), undefined);
  assert.equal(availability(rows, 49, "11:00"), undefined);
  assert.equal(availability(rows, 51, "11:00"), 1);
  assert.equal(availability(rows, 51, "10:10"), undefined);
  assert.equal(availability(rows, 49, "15:00"), undefined);
  assert.equal(availability(rows, 51, "16:40"), undefined);
  assert.equal(availability(rows, 51, "18:00"), undefined);
});

test("calendar visibility rules override limitFutureReservations and preserve the Helsinki opening time", () => {
  assert.deepEqual(
    getCalendarVisibility([
      { ruleName: "kalenteriNakyvyysPaivat", resourceId: 1, startDate: null, endDate: null, startTime: "00:00:00", endTime: "23:59:00", recurrenceDays: null, ruleValue: 4 },
      { ruleName: "kalenteriNakyvyysAvaus", resourceId: 1, startDate: null, endDate: null, startTime: "00:00:00", endTime: "23:59:00", recurrenceDays: null, ruleValue: { localTime: "21:00" } },
    ], date, 1, 3),
    { days: 4, opensAt: "21:00" }
  );
});

test("Aulanko-style hot-time rules use generic minutes parsing and Helsinki opening instants", () => {
  const aulankoSettings: CalendarSettingsResponse = {
    ...settings,
    reservationSettings: { ...settings.reservationSettings, startTime: "07:00:00", endTime: "21:00:00", duration: 10, limitFutureReservations: 0, resources: [{ resourceId: 1, quantity: 4 }] },
    resourceRules: [{ ruleName: "kuumatAjat", resourceId: 1, startDate: null, endDate: null, startTime: "13:50:00", endTime: "14:00:00", recurrenceDays: null, ruleValue: { minutes: 360, inheritToOthers: true } }],
  };
  const slots = computeFreeSlots(date, aulankoSettings, [], new Date("2026-08-11T04:49:00Z"), 1);
  const hot = slots.find((slot) => slot.aika === "13:50")!;
  assert.equal(hot.bookableNow, false);
  assert.equal(hot.bookingRestriction?.minutesBefore, 360);
  assert.match(hot.bookingRestriction?.opensAt ?? "", /T07:50:00\+03:00$/);
  assert.equal(slots.find((slot) => slot.aika === "14:00")?.bookingRestriction, undefined);
  assert.deepEqual(getCalendarVisibility([
    { ruleName: "kalenteriNakyvyysPaivat", resourceId: 1, startDate: null, endDate: null, startTime: "00:00:00", endTime: "23:59:00", recurrenceDays: null, ruleValue: 5 },
    { ruleName: "kalenteriNakyvyysAvaus", resourceId: 1, startDate: null, endDate: null, startTime: "00:00:00", endTime: "23:59:00", recurrenceDays: null, ruleValue: { localTime: "07:00" } },
  ], date, 1, 0), { days: 5, opensAt: "07:00" });
});

test("SHG resource rows remain isolated", () => {
  const rows = [row("08:00", 1), row("08:00", 1), row("08:00", 2)];
  assert.equal(availability(rows, 1, "08:00"), 2);
  assert.equal(availability(rows, 2, "08:00"), 3);
});

test("Kytäjä North West keeps its 07:05 cadence and counts status 4 capacity rows", () => {
  const kytajaSettings: CalendarSettingsResponse = {
    ...settings,
    reservationSettings: {
      ...settings.reservationSettings,
      startTime: "07:05:00",
      endTime: "20:05:00",
      resources: [{ resourceId: 1, quantity: 4 }],
    },
  };
  const rows = [
    row("07:05", 1),
    ...Array.from({ length: 3 }, () => row("07:15", 1)),
    ...Array.from({ length: 4 }, () => row("09:35", 1)),
    ...Array.from({ length: 4 }, () => row("09:45", 1)),
    ...Array.from({ length: 4 }, () => row("10:05", 1, 1, 4)),
    ...Array.from({ length: 4 }, () => row("10:15", 1, 1, 4)),
    ...Array.from({ length: 4 }, () => row("10:45", 1, 1, 4)),
    ...Array.from({ length: 4 }, () => row("14:35", 1, 1, 4)),
    ...Array.from({ length: 2 }, () => row("16:05", 1, 1, 2)),
    ...Array.from({ length: 2 }, () => row("16:05", 1, 1, 4)),
  ];
  const slots = computeFreeSlots(date, kytajaSettings, rows, new Date("2026-08-01T00:00:00Z"), 1);
  const at = (time: string) => slots.find((slot) => slot.aika === time)?.availablePlayers;

  assert.equal(at("07:05"), 3);
  assert.equal(at("07:15"), 1);
  assert.equal(at("07:00"), undefined);
  for (const time of ["09:35", "09:45", "10:05", "10:15", "10:45", "14:35", "16:05"]) {
    assert.equal(at(time), undefined);
  }
});

test("Kytäjä South East keeps its independent 07:00 cadence", () => {
  const southEastSettings: CalendarSettingsResponse = {
    ...settings,
    reservationSettings: {
      ...settings.reservationSettings,
      startTime: "07:00:00",
      endTime: "20:00:00",
      resources: [{ resourceId: 2, quantity: 4 }],
    },
  };
  const slots = computeFreeSlots(date, southEastSettings, [], new Date("2026-08-01T00:00:00Z"), 2);
  assert.deepEqual(slots.slice(0, 3).map((slot) => slot.aika), ["07:00", "07:10", "07:20"]);
});

test("Kytäjä visibility uses the active seven-day API rule without inventing an opening clock", () => {
  assert.deepEqual(
    getCalendarVisibility(
      [{
        ruleName: "kalenteriNakyvyysPaivat",
        resourceId: 1,
        startDate: null,
        endDate: null,
        startTime: "00:00:00",
        endTime: "23:59:00",
        recurrenceDays: null,
        ruleValue: 7,
      }],
      date,
      1,
      7
    ),
    { days: 7 }
  );
});
