# Kide.app Integration — Phase 2A report

## 1. Summary

Phase 2A adds an approved-user, manually confirmed temporary Kide ticket reservation to the existing `/kide` event inspector. It does not add payment, cancellation, persistence, watches, polling, notifications, or background work.

## 2. Files created

- `components/kide/KideReservationDialog.tsx`
- `components/kide/KideReservationResult.tsx`
- `components/kide/kide-format.ts`
- `lib/kide/reservation-input.ts`
- `lib/kide/reservation-input.test.ts`
- `lib/kide/reservation-request.ts`
- `lib/kide/reservation-request.test.ts`

## 3. Files modified

- `components/kide/KideEventInspector.tsx`
- `components/kide/KideEventSummary.tsx`
- `components/kide/KideVariantList.tsx`
- `lib/actions/kide.ts`
- `lib/kide/client.ts`
- `lib/kide/event-id.ts`
- `lib/kide/normalize.ts`
- `lib/kide/normalize.test.ts`
- `lib/kide/types.ts`

## 4. Reservation endpoint implementation

The server-only Kide client makes a `POST` request only to `https://api.kide.app/api/reservations`. It uses native `fetch`, `cache: "no-store"`, and the server-only `KIDE_BEARER_TOKEN` authorization header. Provider failures are converted to safe application errors; raw provider responses are not returned to the browser.

## 5. Exact normalized request model

The server creates the fixed upstream payload:

```ts
{
  expectCart: true,
  includeDeliveryMethods: false,
  toCreate: [{ inventoryId, quantity: 1, productVariantUserForm: null }],
  toCancel: null,
}
```

Phase 2A accepts only quantity `1`.

## 6. Exact normalized response model

`KideReservationResult` contains nullable pricing fields, `reservationsCount`, nullable `reservationsTimeLeft`, and normalized reservation items. Each item includes inventory, variant/product names and identifiers, reserved quantity, creation date, per-item price/currency, availability, Haka requirement, and reservation limits.

## 7. UI flow

Load an event, choose an on-sale variant that Kide reports available and that has an inventory ID, then select **Reserve ticket**. On a successful action, the transient result card shows the reservation outcome.

## 8. Confirmation behavior

Selecting a variant does not make a request. A Dialog explicitly explains that it creates a real temporary reservation, and only **Create reservation** starts the Server Action.

## 9. Restricted variant behavior

Membership, Haka, and student restriction badges remain visible. Restricted variants are not bypassed or altered; Kide remains the authority and verifies account permission. A provider rejection is shown as a safe error.

## 10. Reservation countdown implementation

The result card initializes its local visual countdown from Kide's `reservationsTimeLeft` response value and decrements it once per second. No duration is hardcoded or persisted.

## 11. Security decisions

- The bearer token stays in the server-only client and is never serialized into UI state.
- The action requires `requireApprovedUser()`.
- Event ID, variant ID, and inventory ID must be UUIDs.
- Quantity must be the integer `1`.
- The action reloads the requested event server-side and verifies the selected variant/inventory relationship and current Kide availability before posting.
- The client cannot choose an arbitrary provider URL.
- No credentials, authorization headers, raw provider payloads, or stack traces are exposed.

## 12. Tests added

- Reservation input validation covers valid UUIDs plus invalid IDs, zero, negative, fractional, and excessive quantities.
- Request payload test checks the exact fixed body without making an HTTP request.
- Reservation normalization tests cover price/count/countdown, item fields including availability, and missing optional fields.

## 13. Test results

All 11 focused Kide parser, normalizer, reservation-input, and reservation-request tests passed. No automated test calls the real Kide API.

## 14. Lint/typecheck/build results

- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm run build`: passed.

## 15. Assumptions

- Kide's current reservation API continues to accept the confirmed fixed payload.
- A positive Kide availability value means Kide currently considers the variant available, but is not an exact remaining-ticket count.
- Phase 2A intentionally restricts every reservation to one ticket.

## 16. Known limitations

- No payment or checkout is provided.
- No reservation cancellation is provided.
- Reservation state is transient and disappears on page reload.
- There is no quantity selector.
- No live reservation was created during automated verification.

## 17. Remaining unknowns

- Kide's formal reservation cancellation semantics are not yet captured.
- The API's exact response behavior for expired, competing, or account-restricted reservations should be manually smoke-tested through the confirmation dialog.
- A later phase must determine whether Kide exposes a documented checkout link suitable for the UI.

## 18. Recommended next step

Perform one deliberate production smoke test using a low-risk event: load a known available variant, confirm the reservation, verify the success card and countdown, then complete or remove the reservation directly in Kide.app. Review cancellation semantics separately before implementing any cancellation feature.
