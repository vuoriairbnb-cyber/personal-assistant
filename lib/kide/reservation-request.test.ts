import assert from "node:assert/strict";
import test from "node:test";
import { createKideReservationPayload } from "./reservation-request.ts";

test("creates the fixed Kide reservation payload without calling a provider", () => {
  assert.deepEqual(createKideReservationPayload({ inventoryId: "3f0f1df4-6d72-4e69-92e7-4ee7c544ee20", quantity: 1 }), {
    expectCart: true,
    includeDeliveryMethods: false,
    toCreate: [{ inventoryId: "3f0f1df4-6d72-4e69-92e7-4ee7c544ee20", quantity: 1, productVariantUserForm: null }],
    toCancel: null,
  });
});
