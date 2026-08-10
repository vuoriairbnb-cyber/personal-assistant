import assert from "node:assert/strict";
import test from "node:test";
import { computeFreeSlots } from "./availability.ts";
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

test("SHG resource rows remain isolated", () => {
  const rows = [row("08:00", 1), row("08:00", 1), row("08:00", 2)];
  assert.equal(availability(rows, 1, "08:00"), 2);
  assert.equal(availability(rows, 2, "08:00"), 3);
});
