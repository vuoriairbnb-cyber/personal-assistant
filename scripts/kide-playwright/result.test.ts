import assert from "node:assert/strict";
import test from "node:test";
import { createKideBrowserPocResult, isReservationConfirmed } from "./result.ts";

test("maps terminal POC states to success only after UI confirmation", () => {
  assert.equal(isReservationConfirmed(createKideBrowserPocResult("RESERVATION_CONFIRMED", "confirmed")), true);
  assert.equal(isReservationConfirmed(createKideBrowserPocResult("RESERVATION_FAILED", "failed")), false);
  assert.equal(isReservationConfirmed(createKideBrowserPocResult("USER_CONFIRMATION_ABORTED", "aborted")), false);
});
