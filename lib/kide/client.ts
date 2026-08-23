import "server-only";
import { normalizeKideEvent, normalizeKideReservationResult } from "./normalize";
import { createKideReservationPayload } from "./reservation-request";
import { KideError, type KideEvent, type KideReservationResult } from "./types";

const API_BASE = "https://api.kide.app/api/products";
const RESERVATIONS_URL = "https://api.kide.app/api/reservations";

function token() {
  const value = process.env.KIDE_BEARER_TOKEN?.trim();
  if (!value) throw new KideError("Kide-yhteyttä ei ole määritetty.", 503);
  return value;
}

export function getKideConnectionStatus() { return { configured: Boolean(process.env.KIDE_BEARER_TOKEN?.trim()) }; }

export async function getKideEvent(eventId: string): Promise<KideEvent> {
  const response = await fetch(`${API_BASE}/${encodeURIComponent(eventId)}`, {
    headers: { Authorization: `Bearer ${token()}` }, cache: "no-store",
  });
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) throw new KideError("Kide-tunnistetiedot eivät kelpaa.", 503);
    if (response.status === 404) throw new KideError("Kide-tapahtumaa ei löytynyt.", 404);
    throw new KideError("Kide-tapahtuman hakeminen epäonnistui.", 502);
  }
  let payload: unknown;
  try { payload = await response.json(); }
  catch { throw new KideError("Kide palautti virheellisen vastauksen.", 502); }
  try { return normalizeKideEvent(payload); }
  catch { throw new KideError("Kide palautti virheellisen tapahtuman.", 502); }
}

export async function createKideReservation(input: { inventoryId: string; quantity: number }): Promise<KideReservationResult> {
  let response: Response;
  try {
    response = await fetch(RESERVATIONS_URL, {
      method: "POST", cache: "no-store", headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
      body: JSON.stringify(createKideReservationPayload(input)),
    });
  } catch { throw new KideError("Kide-varauksen muodostaminen epäonnistui.", 502); }
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) throw new KideError("Kide-tunnistetiedot eivät kelpaa.", 503);
    throw new KideError("Kide hylkäsi väliaikaisen varauksen.", response.status >= 400 && response.status < 500 ? 409 : 502);
  }
  let payload: unknown;
  try { payload = await response.json(); }
  catch { throw new KideError("Kide palautti virheellisen varausvastauksen.", 502); }
  try { return normalizeKideReservationResult(payload); }
  catch { throw new KideError("Kide palautti virheellisen varausvastauksen.", 502); }
}
