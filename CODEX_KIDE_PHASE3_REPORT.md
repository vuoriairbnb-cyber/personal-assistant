# Kide.app Integration — Phase 3 report

## 1. Summary

Phase 3 adds a separately armed, local normal-Chrome automatic one-ticket reservation mode to the unpacked Kide extension. It uses Kide's visible DOM and Kide's own frontend only, then stops before payment.

## 2. Files created

- `CODEX_KIDE_PHASE3_REPORT.md`

## 3. Files modified

- `tools/kide-chrome-poc/helpers.js`
- `tools/kide-chrome-poc/content.js`
- `tools/kide-chrome-poc/popup.html`
- `tools/kide-chrome-poc/popup.js`
- `tools/kide-chrome-poc/popup.css`
- `tools/kide-chrome-poc/README.md`
- `tools/kide-chrome-poc/tests/helpers.test.mjs`

## 4. Phase 2C successful smoke-test context

The manual normal-Chrome extension flow was confirmed: an exact target was found, Kide's real `O-ITEM` action was clicked, and the ticket appeared in Kide's cart. The older Playwright approach was not used because Cloudflare showed a verification failure; no bypass was attempted.

## 5. Auto-reservation architecture

The existing local Manifest V3 content script loads a persisted watch from Chrome extension storage when Kide renders. It observes the normal Kide DOM and uses Kide's own UI control. No server, Vercel worker, Supabase job, or cloud browser is involved.

## 6. Explicit ARM behavior

The popup has a separate **Auto reserve** area. The user supplies event, exact variant, local sale start, and bounded timeout; sees resolved local start/expiry values; then separately confirms **ARM AUTO RESERVATION**. That confirmation authorizes one future click. Manual mode remains separate and still needs its own final confirmation.

## 7. Persisted watch state

Chrome extension storage persists only armed state, event ID/URL, exact variant, sale start, expiry, arm time, attempt flag, status, and terminal result. It never persists credentials, cookies, bearer tokens, Authorization headers, or Kide request-verification values.

## 8. Sale-start timing

`datetime-local` input is parsed as the browser's local timezone into a timestamp. The default watch timeout is ten minutes and the UI displays the resolved local start and expiry. **Start watching now** provides an already-on-sale smoke-test path while still requiring the final ARM confirmation.

## 9. MutationObserver strategy

After sale start, a bounded DOM MutationObserver checks for the exact variant's appearance. Missing pre-sale variants are a normal `WAITING_FOR_VARIANT` state, not an error.

## 10. Reload fallback strategy

Only after sale start and while still armed, with no target/control found, the extension uses a conservative four-second normal page reload fallback. Reload startup restores storage state. Refreshing stops on attempt, terminal state, expiry, challenge, or disarm.

## 11. Exact variant matching

Variant matching normalizes whitespace only and compares exactly. `Jäsen` cannot match `Ei jäsen` or `Jäsen + haalarimerkki`.

## 12. Reservation O-ITEM selector

The selector begins at the exact variant element and uses the nearest local `O-ITEM` with an `ng-click` or `data-ng-click` containing `onCreateEditOrCancelReservation`. `O-CHIP` membership controls containing `onProductRequiresMembershipClick` are rejected.

## 13. Single-click / duplicate protection

Before any automatic DOM click, the content script rereads storage and requires armed, unexpired, unattempted, correct-event, no-challenge state. It writes `reservationAttempted: true` before clicking and uses an in-memory lock. A resumed/reloaded watcher with the flag set never clicks again.

## 14. Challenge handling

Visible Cloudflare, CAPTCHA, login, Haka, membership-verification, student-verification, and access-denied states disarm the watch as `VERIFICATION_REQUIRED`. Normal membership labels are not treated as a challenge.

## 15. Reservation verification

After the one DOM click, the script waits for a changed visible Kide cart/reservation/countdown signal. It reports `RESERVATION_CONFIRMED` only from visible UI evidence; otherwise it reports `RESERVATION_RESULT_UNKNOWN` without retrying.

## 16. Watch expiry

Every watch has a bounded expiry timestamp. On expiry it is disarmed as `WATCH_EXPIRED`; no forgotten watch remains active indefinitely.

## 17. User DISARM behavior

The popup shows **DISARM** while an auto watch is armed. It removes the active watch/timers/observer state but does not alter any existing Kide cart reservation.

## 18. Manual smoke-test instructions

1. In normal Chrome, log in to Kide and complete any normal verification manually.
2. Load the unpacked extension and open the intended Kide event.
3. In **Auto reserve**, use the exact variant and choose **Start watching now** for an already-on-sale test.
4. Set a short but safe timeout, prepare the auto reservation, verify the displayed local time, then choose **ARM AUTO RESERVATION**.
5. Do not make a second reservation confirmation. Verify that Kide's visible cart receives one ticket and the popup reports a terminal result.
6. Remove the test reservation manually in Kide after the test.

## 19. Tests added

Helper tests now cover local sale-time parsing, expiry calculation, before-sale, after-sale/missing-variant, ready-to-attempt, attempted/no-second-click, expired, and challenge states, in addition to prior exact matching and `O-ITEM` control tests.

## 20. Test results

Focused extension, Kide parser/normalizer, and existing local browser-POC helper tests pass. No automated test opened Kide or created a reservation.

## 21. Lint/typecheck/build results

`npm run lint`, `npm run typecheck`, and `npm run build` pass after this change.

## 22. Security decisions

Normal Chrome must stay open and the user must already be normally logged in to Kide. No payment is automated. There is no direct reservation API call, token/header handling, Angular scope invocation, Cloudflare/CAPTCHA bypass, access-control bypass, stealth tooling, proxy rotation, or credential storage.

## 23. Known limitations

This is local-only and Chrome must remain running. Kide DOM labels/markup can change and may require a small reviewed update in the isolated selector helper. Chrome storage is used as the durable cross-reload guard; the implementation intentionally never retries an ambiguous click.

## 24. Recommended next phase

Perform the documented manual normal-Chrome smoke test and review the terminal statuses. Do not implement Phase 4 or any payment, cloud automation, or access-control bypass work until that test is accepted.
