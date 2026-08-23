import "server-only";
import { normalizeKideEvent } from "./normalize";
import { KideError, type KideEvent } from "./types";

const API_BASE = "https://api.kide.app/api/products";

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
