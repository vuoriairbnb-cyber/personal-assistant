import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { chromium, type Page } from "playwright";
import { parseKideBrowserPocArgs } from "./input.ts";
import { findVariantReservationButton, findVariantText, pageAppearsUnauthenticated, pageRequiresManualVerification, reservationUiSignalCount, waitForReservationUiSignal } from "./selectors.ts";
import type { KideBrowserPocResult, KideBrowserPocState } from "./types.ts";

function result(state: KideBrowserPocState, message: string): KideBrowserPocResult { console.log(`${state}: ${message}`); return { state, message }; }
async function waitForEnter(prompt: string) { const readline = createInterface({ input, output }); try { return await readline.question(prompt); } finally { readline.close(); } }
async function stopForVerification(page: Page) { if (await pageRequiresManualVerification(page)) { result("KIDE_VERIFICATION_REQUIRED", "Kide displayed a verification or access challenge. Complete it manually or restart; the POC will not bypass it."); return true; } return false; }

async function run(page: Page): Promise<KideBrowserPocResult> {
  const options = parseKideBrowserPocArgs(process.argv.slice(2));
  await page.goto("https://kide.app", { waitUntil: "domcontentloaded" });
  if (await stopForVerification(page)) return { state: "KIDE_VERIFICATION_REQUIRED", message: "Manual verification required." };
  if (await pageAppearsUnauthenticated(page)) {
    result("AUTH_REQUIRED", "Log in manually in the opened Chromium window. No credentials are requested or stored by this script.");
    const loginConfirmation = await waitForEnter("Press ENTER after you have completed normal Kide login, or type anything else to abort: ");
    if (loginConfirmation.trim()) return result("USER_CONFIRMATION_ABORTED", "Login was not confirmed; no reservation action was clicked.");
    if (await stopForVerification(page)) return { state: "KIDE_VERIFICATION_REQUIRED", message: "Manual verification required." };
  }
  await page.goto(options.eventUrl, { waitUntil: "domcontentloaded" });
  if (await stopForVerification(page)) return { state: "KIDE_VERIFICATION_REQUIRED", message: "Manual verification required." };
  const eventTitle = await page.getByRole("heading").first().textContent().catch(() => null);
  if (!eventTitle?.trim()) return result("EVENT_NOT_FOUND", "Kide event UI did not expose an event heading.");
  const variantText = await findVariantText(page, options.variantName);
  if (!variantText) return result("VARIANT_NOT_FOUND", `Exact variant was not found: ${options.variantName}`);
  const reservationButton = await findVariantReservationButton(variantText);
  if (!reservationButton || !await reservationButton.isEnabled()) return result("VARIANT_NOT_AVAILABLE", "The selected variant does not have an interactable, variant-scoped reservation control.");
  console.log(`Event: ${eventTitle.trim()}`); console.log(`Variant: ${options.variantName}`); console.log("Action ready.");
  const confirmation = await waitForEnter("Press ENTER to create the real temporary reservation, or type anything else to abort: ");
  if (confirmation.trim()) return result("USER_CONFIRMATION_ABORTED", "No reservation action was clicked.");
  if (await stopForVerification(page)) return { state: "KIDE_VERIFICATION_REQUIRED", message: "Manual verification required." };
  const signalsBefore = await reservationUiSignalCount(page);
  await reservationButton.click({ timeout: 10_000 });
  try { await waitForReservationUiSignal(page, signalsBefore); }
  catch { return result("RESERVATION_FAILED", "Kide UI did not show a new reservation/cart state after one click. The POC will not retry."); }
  const signalsAfter = await reservationUiSignalCount(page);
  if (signalsAfter <= signalsBefore) return result("RESERVATION_FAILED", "Kide UI did not show a verifiable reservation/cart signal. The POC will not retry.");
  return result("RESERVATION_CONFIRMED", "Reservation appears successful in Kide UI. STOPPING BEFORE PAYMENT.");
}

async function main() {
  let context: Awaited<ReturnType<typeof chromium.launchPersistentContext>> | null = null;
  try {
    const options = parseKideBrowserPocArgs(process.argv.slice(2));
    context = await chromium.launchPersistentContext(options.profileDir, { headless: false, viewport: { width: 1440, height: 1000 } });
    const page = context.pages()[0] ?? await context.newPage(); const pocResult = await run(page);
    process.exitCode = pocResult.state === "RESERVATION_CONFIRMED" ? 0 : 1;
  } catch (error) { console.error(error instanceof Error ? error.message : "Kide Playwright POC failed."); process.exitCode = 1; }
  finally { await context?.close(); }
}

void main();
