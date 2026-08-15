const MACHINE_TO_MACHINE_PATHS = new Set([
  "/api/elevenlabs/golf-search",
  "/api/cron/golf-watches",
]);

/** Only endpoints with their own mandatory machine authentication bypass user sessions. */
export function bypassesUserSession(pathname: string): boolean {
  return MACHINE_TO_MACHINE_PATHS.has(pathname);
}
