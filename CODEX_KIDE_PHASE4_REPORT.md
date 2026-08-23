# Kide.app Integration — Phase 4 report

## 1. Summary

Phase 4 adds the Personal Assistant control plane for one paired local Chrome Kide agent. The app persists and arms watch criteria; the normal Chrome extension remains the only component that can click Kide's visible reservation control.

## 2. Files created

- `db/migrations/0010_kide_control_plane.sql`
- `lib/kide/control-plane.ts`
- `lib/kide/control-plane.test.ts`
- `lib/kide/agent-auth.ts`
- `lib/kide/queries.ts`
- `components/kide/KideControlPlane.tsx`
- `app/api/kide/agent/pair/route.ts`
- `app/api/kide/agent/watch/route.ts`
- `app/api/kide/agent/heartbeat/route.ts`
- `app/api/kide/agent/status/route.ts`

## 3. Files modified

The Kide page, Kide Server Actions, manual database types, and local Chrome extension manifest/popup/content scripts were extended.

## 4. Database migration

Migration `0010_kide_control_plane.sql` creates agent devices, one-time pairings, and persisted watches. It uses a partial unique index to allow only one active watch per user and an atomic security-definer pairing-consumption function.

## 5. RLS model

Approved signed-in users have owner-only RLS access to their own Kide metadata. The extension does not use Supabase sessions; its narrow API routes use hashed agent-token lookup through the server-only service client.

## 6. Pairing architecture

The user generates a five-minute pairing code from `/kide`. The database stores only its SHA-256 hash. The extension explicitly requests a runtime host permission for the entered Personal Assistant origin, exchanges the code once, and stores the returned opaque agent token only in Chrome local storage.

## 7. Agent token security

The permanent token is 32 random bytes encoded as opaque text. Only its SHA-256 hash is stored server-side. It is limited to pairing-agent watch reads, heartbeats, and safe watch status updates; it is not a user session, Kide credential, or service-role key.

## 8. Agent API routes

- `POST /api/kide/agent/pair`
- `GET /api/kide/agent/watch`
- `POST /api/kide/agent/heartbeat`
- `POST /api/kide/agent/status`

They are fixed-purpose endpoints, not a generic database proxy.

## 9. Personal Assistant /kide UI

`/kide` now shows agent pairing/last-seen status, agent revocation, the active-watch status, DISARM, and a separate Auto Reservation prepare/confirm flow. The existing event inspector remains present.

## 10. ARM flow

The server validates event UUID, mode-specific target criteria, cents price, UTC sale start, bounded timeout, and quantity-one semantics before writing an armed watch. A database constraint/index rejects multiple active watches per user.

## 11. DISARM flow

DISARM marks the user-owned persisted watch disarmed. The extension receives a missing/disarmed server watch on its next sync and stops its local executor; it never removes a Kide cart item.

## 12. Configurable max-price behavior

First-available watches persist `maxPriceCents`. Exact mode persists only an exact name. Existing extension selection remains DOM-order-first and local-only.

## 13. Sale-time/timezone handling

The Personal Assistant UI uses `datetime-local`; it converts the chosen browser-local value to an ISO timestamp before the Server Action persists `timestamptz`. Start Watching Now uses server receipt time.

## 14. Extension synchronization

After explicit pairing, the content script syncs immediately and approximately every 15 seconds while a Kide tab is open. Its authenticated API requests run through the extension service worker, not the Kide page context. It imports server configuration into the existing Phase 3/3.1 engine rather than creating a second executor. Older server updates cannot overwrite a newer locally attempted state.

## 15. Local execution architecture

The paired agent still uses normal Kide DOM, exact/price-capped targeting, the proven `O-ITEM` action, local persisted single-attempt guard, and no direct Kide API calls.

## 16. Status/heartbeat flow

Authenticated agent calls update device `last_seen_at`. Watch-state transitions and terminal local states report only safe watch ID, status, selected variant name, and cents price to the app. No DOM, cookies, tokens, headers, or session data are reported.

## 17. Revocation

`/kide` can revoke a paired device. The API helper only accepts a device with a null `revoked_at`, so subsequent token requests receive 401.

## 18. Security boundaries

No Kide bearer token is sent to the extension. No service role key, Supabase session, credentials, request headers, payment, Cloudflare/CAPTCHA bypass, or Kide API reservation call is introduced.

## 19. Tests

Focused control-plane tests cover mode validation, expiry, invalid targets/timeouts, quantity-one enforcement, and opaque credential hashing. The existing extension helper tests cover the local selector and targeting primitives.

## 20. lint/typecheck/build

Run focused tests plus lint, typecheck, and production build before review.

## 21. Manual pairing instructions

Apply migration 0010 to the intended Supabase project, deploy the app, then use `/kide` to generate a code. Reload the unpacked extension, enter the exact app origin, one-time code, and device name, and pair. Verify the app shows a recent last-seen time.

## 22. Phase 4 smoke-test instructions

After review, use the documented event and first-available max-price criteria from the Phase 4 brief. Arm only in Personal Assistant; do not arm separately in the extension. Confirm one normal Kide DOM reservation and then check `/kide` for terminal status.

## 23. Known limitations

The migration must be applied externally before production functionality works. The extension needs a normal Kide tab open to sync and execute. Runtime optional host permissions are necessarily declared broadly by Manifest V3 but requested only for the user-entered exact origin.

## 24. Recommended next phase

Perform manual pairing plus a controlled normal-Chrome smoke test before any notification, scheduler, or payment work.
