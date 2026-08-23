# Kide.app Integration — Phase 2B report

## 1. Summary

Phase 2B replaces the unsuitable direct reservation path with a local-only Playwright proof of concept. It drives Kide only through a real headed Chromium browser and its visible UI, then stops before payment.

## 2. Files created

- `scripts/kide-playwright/input.ts`
- `scripts/kide-playwright/selectors.ts`
- `scripts/kide-playwright/variant.ts`
- `scripts/kide-playwright/result.ts`
- `scripts/kide-playwright/types.ts`
- `scripts/kide-playwright/run.ts`
- focused `*.test.ts` files under `scripts/kide-playwright/`

## 3. Files modified

- `.gitignore`
- `package.json` and `package-lock.json`
- the existing Kide inspector/client/action/normalizer files to remove the direct reservation path and its UI

## 4. Playwright version

The project uses the official `playwright` package, version `^1.62.1`, with `tsx` used only to run the local TypeScript CLI.

## 5. Persistent-profile approach

The CLI launches a headed persistent Chromium context. Its default profile is `.local/kide-playwright-profile`, which is gitignored because it can contain authenticated browser state. A custom local profile path may be supplied with `--profile-dir` and must remain private.

## 6. Authentication approach

No Kide username or password is configured, read, printed, or stored by the code. If Kide appears unauthenticated, the browser stays open for the developer to complete Kide's normal login manually, then explicitly press Enter to continue.

## 7. Event navigation logic

The CLI validates a Kide event URL or UUID using the existing safe Kide event parser and opens the canonical Kide event page in Chromium. It confirms that a visible event heading exists before continuing.

## 8. Variant matching logic

The requested variant is matched with exact visible text. The isolated selector helper searches for an interactable button scoped to the variant's semantic container. It does not fall back to clicking an unscoped page-wide reservation control.

## 9. Reservation click logic

The script prints an action-ready summary, then waits for an empty Enter confirmation. It performs at most one UI click in a run. It never uses `fetch`, `page.evaluate(fetch(...))`, Playwright request APIs, or Kide's reservation endpoint directly.

## 10. Success verification logic

After the one click, the script waits for a newly visible Kide cart/reservation UI signal. A click alone is never considered success. A confirmed run prints `RESERVATION_CONFIRMED` and `STOPPING BEFORE PAYMENT`.

## 11. Safety / anti-bypass decisions

- CAPTCHA, access-denied, Haka, membership, student-verification, and similar challenge text produces `KIDE_VERIFICATION_REQUIRED` and stops the flow.
- There are no stealth plugins, credential automation, header generation, fingerprint changes, proxy rotation, or CAPTCHA solving.
- The direct server-side reservation API call and `/kide` reservation UI from Phase 2A have been removed.
- No payment, checkout, cancellation, background process, database state, cron, notifications, or automation is added.

## 12. CLI usage

```powershell
npm run kide:browser-poc -- --event <Kide-event-URL-or-UUID> --variant "Exact variant name"
```

Optionally add `--profile-dir <private-local-path>`. Run `npx playwright install chromium` once after installing dependencies.

## 13. Tests

Focused Node tests cover event parsing, CLI validation, exact variant-name matching, and terminal-state mapping. They do not start a browser and never create a Kide reservation.

## 14. Lint/typecheck/build results

- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm run build`: passed.
- Playwright Chromium was installed locally for headed runs.

## 15. Manual test instructions

1. Choose an already-on-sale, low-risk Kide event and the exact visible ticket-variant name.
2. Run the CLI command above.
3. Log in manually if prompted; never provide credentials to the script.
4. Verify the printed event, variant, and `Action ready.` summary.
5. Press Enter only if you intentionally want one real temporary reservation.
6. Verify Kide's visible reservation/cart state. The script stops before payment.

## 16. Known limitations

- Kide's UI selectors may need a small documented update if Kide changes its markup or button labels.
- Authentication/challenge detection is conservative and intentionally requires manual interaction rather than trying to infer or bypass account state.
- The POC does not preserve any reservation result in Personal Assistant.

## 17. Recommended next step

Perform one deliberate manual smoke test with an already-on-sale low-risk event. If selectors need adjustment, update only `scripts/kide-playwright/selectors.ts`; do not introduce direct API calls or bypass behavior.
