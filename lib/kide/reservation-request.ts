import type { KideReservationInput } from "./reservation-input.ts";

export function createKideReservationPayload(input: Pick<KideReservationInput, "inventoryId" | "quantity">) {
  return {
    expectCart: true,
    includeDeliveryMethods: false,
    toCreate: [{ inventoryId: input.inventoryId, quantity: input.quantity, productVariantUserForm: null }],
    toCancel: null,
  };
}
