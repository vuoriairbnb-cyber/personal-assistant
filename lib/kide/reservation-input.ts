import { isKideUuid } from "./event-id.ts";
import { KideError } from "./types.ts";

export const MAX_KIDE_RESERVATION_QUANTITY = 1;
export type KideReservationInput = { eventId: string; variantId: string; inventoryId: string; quantity: number };

export function validateKideReservationInput(value: unknown): KideReservationInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new KideError("Virheellinen Kide-varaus.", 400);
  const input = value as Record<string, unknown>;
  if (!isKideUuid(input.eventId) || !isKideUuid(input.variantId) || !isKideUuid(input.inventoryId)) throw new KideError("Virheellinen Kide-lipputunniste.", 400);
  if (typeof input.quantity !== "number" || !Number.isInteger(input.quantity) || input.quantity < 1 || input.quantity > MAX_KIDE_RESERVATION_QUANTITY) {
    throw new KideError(`Varausmäärän tulee olla 1 tässä vaiheessa.`, 400);
  }
  return { eventId: input.eventId.toLowerCase(), variantId: input.variantId.toLowerCase(), inventoryId: input.inventoryId.toLowerCase(), quantity: input.quantity };
}
