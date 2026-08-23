import type { KideBrowserPocResult, KideBrowserPocState } from "./types.ts";

export function createKideBrowserPocResult(state: KideBrowserPocState, message: string): KideBrowserPocResult {
  return { state, message };
}

export function isReservationConfirmed(result: KideBrowserPocResult) {
  return result.state === "RESERVATION_CONFIRMED";
}
