# Kide.app Integration — Phase 3.1 report

## 1. Summary

Phase 3.1 adds a second local Chrome-extension auto-reservation target mode: **First available under max price**. Exact-variant mode remains unchanged.

## 2. Files created

- `CODEX_KIDE_PHASE3_1_REPORT.md`

## 3. Files modified

- `tools/kide-chrome-poc/helpers.js`
- `tools/kide-chrome-poc/content.js`
- `tools/kide-chrome-poc/popup.html`
- `tools/kide-chrome-poc/popup.js`
- `tools/kide-chrome-poc/popup.css`
- `tools/kide-chrome-poc/tests/helpers.test.mjs`

## 4. New target modes

Auto reserve now offers **Exact variant** and **First available under max price**. Exact mode needs the existing exact variant name. First-available mode does not require one and can therefore be armed before Kide renders variants.

## 5. Maximum price representation

The popup accepts a per-watch price limit and validates it from zero through 10,000 EUR. The persisted watch uses `maxPriceCents` integer minor units, never a floating-point comparison or formatted string.

## 6. Price parser

The isolated parser accepts visible Kide formats including `4,00 €`, `15.00 €`, and `25 €`, as well as whitespace/non-breaking-space variants. It returns cents. An ambiguous or malformed visible price is rejected rather than guessed.

## 7. Candidate extraction

The content script enumerates only local actionable Kide `O-ITEM` elements with the proven reservation `ng-click`/`data-ng-click`. Name and price are derived solely from that item's visible local text.

## 8. Candidate selection order

Candidates are processed in normal visible DOM order. The extension selects the first actionable candidate whose parsed price is at or under the user's configured maximum; it does not choose the cheapest global ticket.

## 9. Availability/actionability filtering

Hidden, disabled, `aria-disabled`, sold-out, unavailable, and unparseable-price items are skipped. Kide numeric availability is not interpreted as an exact remaining-ticket count.

## 10. Restriction behavior

Membership/Haka/student rights are never bypassed. Informational member labels are not themselves treated as a challenge. A real post-click verification state terminates the watch and does not trigger another candidate attempt.

## 11. Single-attempt protection

The existing persisted `reservationAttempted` guard is written before the one DOM click. Even when first-available mode evaluates multiple candidates, it clicks at most the selected first eligible candidate and never tries the next one automatically.

## 12. Persisted configuration

The Chrome-storage model now includes `targetMode`, nullable `exactVariantName`, and nullable `maxPriceCents`, alongside existing timing, armed, attempt, and terminal fields. This shape is suitable for a later configuration hand-off, without implementing one now.

## 13. Edit/re-arm behavior

The popup refuses to prepare new auto criteria while a watch is armed. The user must DISARM, edit, then ARM again; edits never silently alter an armed authorization.

## 14. Start Watching Now smoke test

For an already-on-sale event, choose First available under max price, set the desired cap, select Start watching now, then explicitly ARM. The agent evaluates currently visible candidates in DOM order and can make only one reservation click.

## 15. Pre-sale behavior

No exact variant is required in first-available mode. Empty pre-sale ticket DOM is a normal waiting state; the existing observer and conservative reload fallback resume when sales render candidates.

## 16. Tests

Focused helpers test comma/dot/whole-Euro parsing, malformed rejection, max-price validation, exact-mode behavior retained by existing tests, candidate eligibility, first eligible order, disabled/unavailable filtering, and prior O-ITEM/O-CHIP/single-attempt tests.

## 17. lint/typecheck/build

`npm run lint`, `npm run typecheck`, and `npm run build` pass. Automated tests do not open Kide or create a reservation.

## 18. Known limitations

Visible ticket text and Kide DOM markup can change; selector/price parsing remains isolated for reviewed updates. The extension intentionally skips anything whose price cannot be determined locally and reliably.

## 19. Phase 4 compatibility

The watch configuration has explicit target mode, exact name, cents limit, timing, and quantity-one semantics, allowing a future Personal Assistant UI to produce the same configuration without defining an integration in this phase.

## 20. Recommended next step

Manually smoke-test first-available mode in normal Chrome with a low-risk already-on-sale event and an empty cart. Review the selected visible ticket and terminal status before any Phase 4 work.

## Phase 3.1 popup preparation fix

Auto reserve now has its own event and target fields, ordered before timing, prepared summary, and the prepare/ARM controls. Exact and max-price fields are conditional by target mode. Preparation uses specific field-level validation messages; notably, first-available mode accepts an empty exact-variant value when a valid maximum price, timing choice, and timeout are supplied.
