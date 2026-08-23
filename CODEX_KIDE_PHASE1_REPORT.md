# Kide.app Integration — Phase 1 report

## 1. Summary

Implemented a read-only `/kide` event inspector for approved users. It shows whether a server-side Kide credential is configured, accepts a Kide event URL or UUID, fetches the event through a Server Action, and renders a narrow normalized event/variant model.

No reservation, cart, purchase, polling, background job, notification, database table, or migration was added.

## 2. Files created

- `app/(app)/kide/page.tsx`
- `components/kide/KideConnectionStatus.tsx`
- `components/kide/KideEventInspector.tsx`
- `components/kide/KideEventSummary.tsx`
- `components/kide/KideVariantList.tsx`
- `lib/actions/kide.ts`
- `lib/kide/types.ts`
- `lib/kide/event-id.ts`
- `lib/kide/normalize.ts`
- `lib/kide/client.ts`
- `lib/kide/event-id.test.ts`
- `lib/kide/normalize.test.ts`
- `CODEX_KIDE_PHASE1_REPORT.md`

`PROJECT_CONTEXT_KIDE.md` was created in the preceding documentation task and was retained as the implementation context.

## 3. Files modified

- `components/layout/nav-items.tsx` — adds `/kide` to the shared desktop/mobile navigation.
- `.env.example` — documents the server-only `KIDE_BEARER_TOKEN` name without a value.

## 4. Architecture decisions

- Kide provider logic is isolated in server-only `lib/kide/client.ts`.
- `lib/kide/normalize.ts` converts only selected provider fields into local `KideEvent` and `KideVariant` models; raw payloads are not returned to the browser.
- `lib/kide/event-id.ts` accepts a raw UUID or an HTTPS `kide.app` event URL, and rejects unrelated domains/paths.
- `lib/actions/kide.ts` is the approved-user Server Action boundary. No client-visible Kide API route was added.
- UI uses existing Card, Button, Input, Badge, navigation, and Tailwind semantic-token patterns.

## 5. Security decisions

- `KIDE_BEARER_TOKEN` is read only in the server-only client.
- The browser receives only normalized event data and safe error messages.
- The token is not logged, serialized, stored in Supabase, accepted from a form, placed in browser storage, or exposed through a public environment variable.
- Kide HTTP requests use native `fetch`, Bearer authentication on the server, and `cache: "no-store"`.
- The feature uses the existing user/session middleware and `requireApprovedUser()`; no middleware exemption was added.

## 6. Credential usage

The server reads the `KIDE_BEARER_TOKEN` environment variable as a raw bearer token, constructs the Authorization header internally, and uses it only for the read-only event request. No credential value is included in this report.

## 7. Event URL parsing

Accepted input:

- A valid UUID.
- An HTTPS event URL on `kide.app` or `www.kide.app` with the path shape `/events/<uuid>`.

Malformed IDs, empty input, unrelated domains, non-HTTPS URLs, and other paths return a safe validation error.

## 8. Normalized domain model

`KideEvent` contains selected event identity, sale-window/status fields, conservative availability-related flags, and normalized variants.

`KideVariant` contains selected ID/inventory/price/status/restriction fields. Variant availability is kept as a raw numeric value but is not presented as an exact remaining-ticket count.

## 9. Pre-sale events

If an event has not started sales and Kide returns no variants, the UI renders a normal "Waiting for ticket sales" informational state. It does not treat an empty variant array as an error and does not invent variant or inventory identifiers.

## 10. Restricted variants

The normalized model preserves Haka, membership, student-card, and access-control membership-ID fields. The UI displays clear restriction badges but does not attempt authentication, bypass, or reservation behavior.

## 11. Tests

Added focused `node:test` coverage for:

- Valid and invalid event URL/UUID parsing.
- Pre-sale empty variants.
- Available, sold-out, and mixed variants.
- Membership/Haka restrictions.
- Free variants.
- Missing optional provider fields.

Result: 6/6 Kide tests passed.

## 12. Validation results

- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm run build`: passed; `/kide` is present in the production route output.

## 13. Assumptions

- `pricePerItem` is treated as minor currency units in one dedicated display helper, based on the provided example.
- Kide product dates are rendered with `Intl.DateTimeFormat` when parseable; otherwise their normalized string is shown unchanged.
- A configured credential is represented only by a boolean status; no connection test is made on page load.

## 14. Phase 2 questions / TODOs

- Confirm Kide watch semantics, especially pre-sale variant availability and exact interpretation of availability values.
- Decide whether Kide credentials are global server configuration or require a new per-user OAuth/token model. No encrypted per-user token-store pattern currently exists.
- Define a database schema, idempotency keys, polling/webhook strategy, and notification event contract before adding watches.
- Confirm provider rate limits and terms before introducing background polling.

## 15. Recommended next step

Review the live read-only inspector against representative pre-sale, available, sold-out, free, and restricted events. Then design Phase 2 watch semantics and storage as a separate, security-reviewed change before adding any scheduler or notification behavior.
