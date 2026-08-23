import assert from "node:assert/strict";
import test from "node:test";
import { validateKideReservationInput } from "./reservation-input.ts";

const valid = {
  eventId: "1e0f1df4-6d72-4e69-92e7-4ee7c544ee20",
  variantId: "2f0f1df4-6d72-4e69-92e7-4ee7c544ee20",
  inventoryId: "3f0f1df4-6d72-4e69-92e7-4ee7c544ee20",
  quantity: 1,
};

test("accepts one valid Kide reservation", () => {
  assert.deepEqual(validateKideReservationInput(valid), valid);
});

test("rejects invalid identifiers and invalid quantities", () => {
  for (const value of [
    { ...valid, inventoryId: "not-a-uuid" },
    { ...valid, quantity: 0 },
    { ...valid, quantity: -1 },
    { ...valid, quantity: 1.5 },
    { ...valid, quantity: 2 },
  ]) {
    assert.throws(() => validateKideReservationInput(value));
  }
});
