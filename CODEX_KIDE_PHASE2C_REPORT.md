# Kide.app Integration — Phase 2C report

## 1. Summary

Phase 2C adds a local, unpacked Manifest V3 Chrome extension proof of concept. It acts only in the developer's ordinary logged-in Kide tab, finds an exact visible ticket variant, requires two deliberate popup steps, makes at most one local UI click, verifies a visible Kide result, and stops before payment.

## 2. Files created

- `tools/kide-chrome-poc/manifest.json`
- `tools/kide-chrome-poc/popup.html`, `popup.js`, and `popup.css`
- `tools/kide-chrome-poc/helpers.js`
- `tools/kide-chrome-poc/content.js`
- `tools/kide-chrome-poc/styles.css`
- `tools/kide-chrome-poc/README.md`
- `tools/kide-chrome-poc/tests/helpers.test.mjs`

## 3. Files modified

`CODEX_KIDE_PHASE2C_REPORT.md` was added. The existing Phase 2B worktree changes remain in place and Phase 2A's direct reservation functionality remains disabled.

## 4. Manifest permissions

The Manifest V3 extension requests only `storage` and `activeTab`, with Kide-only host permissions for `https://kide.app/*` and `https://www.kide.app/*`. It has no permissions for unrelated sites, request interception, cookies, or background network activity.

## 5. How to load the unpacked extension

Open `chrome://extensions` in normal Chrome, enable Developer mode, select **Load unpacked**, and choose `tools/kide-chrome-poc`. Detailed local steps are in the extension README.

## 6. Popup workflow

Enter a Kide event URL/UUID plus exact variant name, choose **Find ticket**, then **Arm reservation**. Arming only prepares a target. A separate **Create real reservation** confirmation is required before one DOM click.

## 7. Exact variant matching

Visible text is normalized only for whitespace and then compared exactly. Thus `Jäsen` does not match `Ei-jäsen` or `Jäsen + haalarimerkki`.

## 8. DOM selector strategy

The content script waits with a bounded MutationObserver, finds the exact visible variant text, then first uses its local `closest(...)` ancestor relationship to locate `O-ITEM[ng-click*="onCreateEditOrCancelReservation"]` (or its `data-ng-click` counterpart). It verifies the tag and attribute before using that item as the ordinary Kide reservation control. The nested `O-CHIP` membership action is explicitly not a reservation control. The prior semantic button search remains only as an isolated fallback for other Kide markup.

## 9. Reservation click behavior

The extension sends one message from the popup to the content script. Only after final confirmation does the script call the found Kide UI button's normal `.click()` handler. It makes no direct HTTP request.

## 10. One-click limit

The content script clears its armed state before clicking. One armed operation can therefore make only one reservation click. An unclear result is not retried; the user must manually arm again.

## 11. Challenge detection

Visible Cloudflare, verification, CAPTCHA, login, Haka, membership, student-verification, and access-denied text returns `VERIFICATION_REQUIRED` before any click. The extension does not bypass or automate those checks.

## 12. Success verification

After the click, the script observes the normal Kide DOM for a changed cart/reservation/countdown signal. It returns `RESERVATION_CONFIRMED` only with visible evidence; otherwise it returns `RESERVATION_RESULT_UNKNOWN` and stops.

## 13. Security decisions

- No username, password, cookies, bearer token, Authorization header, or request-verification value is read, stored, logged, or generated.
- The extension uses the existing normal Chrome session only.
- It does not use request interception, direct reservation API calls, stealth tooling, proxy rotation, fingerprint changes, or CAPTCHA solving.
- It does not automate payment, checkout, billing, cancellation, watching, persistence, cron, or notifications.

## 14. Manual smoke test steps

1. Open normal Chrome and manually log in to Kide; complete any normal Cloudflare verification yourself.
2. Load the unpacked extension.
3. Open the known review target event `359b2e27-e383-4d64-b4f7-c461c75cffa8` (Kultyrkierros).
4. In the popup use the exact variant `Jäsen`.
5. Confirm the found event and variant, then arm it.
6. Only after review, click **Create real reservation**.
7. Verify Kide's visible cart/reservation state. The extension stops before payment.

## 15. Tests

Node tests cover UUID/event parsing, whitespace normalization, exact variant matching, challenge detection, the `READY`-only reservation state transition, and the observed `Jäsen` → `O-ITEM` reservation-control versus nested `O-CHIP` membership-control distinction. No automated test opens Kide or creates a reservation.

## 16. Lint/typecheck/build results

The project lint, typecheck, and production build are run after this implementation. Phase 2B's Playwright Chromium launch smoke test remains successful.

## 17. Known limitations

Kide's client-rendered DOM and labels may change, requiring a small reviewed update in the isolated `content.js` selector helper. Popup-driven navigation requires reopening the popup after the Kide event page renders. No real normal-Chrome reservation test has been run yet.

## 18. Recommended next phase

Perform the documented manual normal-Chrome smoke test only after review. If selector adjustments are necessary, limit them to the local DOM helper. Do not add automatic sale-start reservation, network automation, or Cloudflare bypass behavior.

## Phase 2B result

Playwright-controlled Chromium reached Kide login, but Cloudflare displayed **Verification failed**. No Cloudflare bypass was attempted.
