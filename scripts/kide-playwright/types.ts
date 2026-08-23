export type KideBrowserPocState = "AUTH_REQUIRED" | "EVENT_NOT_FOUND" | "VARIANT_NOT_FOUND" | "VARIANT_NOT_AVAILABLE" | "USER_CONFIRMATION_ABORTED" | "KIDE_VERIFICATION_REQUIRED" | "RESERVATION_FAILED" | "RESERVATION_CONFIRMED";

export type KideBrowserPocResult = { state: KideBrowserPocState; message: string };
