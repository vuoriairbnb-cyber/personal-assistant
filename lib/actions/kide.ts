"use server";

import { requireApprovedUser } from "@/lib/auth/guard";
import { createKideReservation, getKideEvent } from "@/lib/kide/client";
import { parseKideEventId } from "@/lib/kide/event-id";
import { validateKideReservationInput } from "@/lib/kide/reservation-input";
import { KideError, type KideEvent, type KideReservationResult } from "@/lib/kide/types";

export type KideInspectionResult = { ok: true; event: KideEvent } | { ok: false; error: string };
export type KideReservationActionResult = { ok: true; reservation: KideReservationResult } | { ok: false; error: string };

export async function inspectKideEvent(input: string): Promise<KideInspectionResult> {
  try {
    await requireApprovedUser();
    return { ok: true, event: await getKideEvent(parseKideEventId(input)) };
  } catch (error) {
    if (error instanceof KideError) return { ok: false, error: error.message };
    return { ok: false, error: "Kide-tapahtumaa ei voitu hakea." };
  }
}

export async function reserveKideTicket(input: unknown): Promise<KideReservationActionResult> {
  try {
    await requireApprovedUser();
    const request = validateKideReservationInput(input);
    const event = await getKideEvent(request.eventId);
    const variant = event.variants.find((item) => item.id.toLowerCase() === request.variantId && item.inventoryId?.toLowerCase() === request.inventoryId);
    if (!variant?.inventoryId || !variant.salesOngoing || variant.availability === null || variant.availability <= 0) {
      throw new KideError("Valittu Kide-lippu ei ole enää saatavilla.", 409);
    }
    return { ok: true, reservation: await createKideReservation({ inventoryId: variant.inventoryId, quantity: request.quantity }) };
  } catch (error) {
    if (error instanceof KideError) return { ok: false, error: error.message };
    return { ok: false, error: "Kide-varauksen luominen epäonnistui." };
  }
}
