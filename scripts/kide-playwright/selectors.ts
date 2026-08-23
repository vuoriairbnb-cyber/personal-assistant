import type { Locator, Page } from "playwright";

const RESERVATION_BUTTON_NAMES = /add to cart|reserve|add ticket|lisää ostoskoriin|varaa|lisää lippu/i;
const RESERVATION_UI_TEXT = /cart|basket|reservation|reserved|ostoskori|varattu|varaus|minutes? remaining|minuuttia jäljellä/i;
const VERIFICATION_TEXT = /captcha|verify you are human|access denied|unusual traffic|turvatarkistus|vahvista henkilöllisyys|haka authentication|membership verification|student verification/i;
const LOGIN_TEXT = /log in|sign in|kirjaudu sisään|kirjaudu/i;

export async function pageRequiresManualVerification(page: Page) { return (await page.getByText(VERIFICATION_TEXT).count()) > 0; }
export async function pageAppearsUnauthenticated(page: Page) { return (await page.getByText(LOGIN_TEXT).count()) > 0; }
export async function findVariantText(page: Page, variantName: string): Promise<Locator | null> { const locator = page.getByText(variantName, { exact: true }).first(); return await locator.count() ? locator : null; }

export async function findVariantReservationButton(variantText: Locator): Promise<Locator | null> {
  const candidateContainers = [variantText.locator("xpath=ancestor::*[self::article or self::li or @role='listitem' or self::section][1]"), variantText.locator("xpath=ancestor::*[.//button][1]")];
  for (const container of candidateContainers) {
    if (!await container.count()) continue;
    const button = container.getByRole("button", { name: RESERVATION_BUTTON_NAMES }).first();
    if (await button.count()) return button;
  }
  return null;
}

export async function reservationUiSignalCount(page: Page) { return page.getByText(RESERVATION_UI_TEXT).count(); }

export async function waitForReservationUiSignal(page: Page, previousCount: number) {
  await page.waitForFunction((before) => {
    const text = document.body.innerText.toLowerCase();
    const matches = text.match(/cart|basket|reservation|reserved|ostoskori|varattu|varaus|minutes? remaining|minuuttia jäljellä/g) ?? [];
    return matches.length > before;
  }, previousCount, { timeout: 10_000 });
}
