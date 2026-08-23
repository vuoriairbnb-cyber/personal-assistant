# Personal Assistant — Kide.app integration context

This document describes the current repository so a developer can add a Kide.app integration without first reading the whole codebase. It is documentation only; no Kide integration exists yet.

## 1. Project overview

Personal Assistant is a private, authenticated personal-operations app. Its implemented modules include travel planning, a calendar with Airbnb iCal sync, Claude-assisted trip work, ElevenLabs conversation inbox data, and an extensive WiseGolf search/watch/notification workflow.

- **Framework:** Next.js `15.1.4` (the installed lockfile may resolve a newer compatible Next 15 patch).
- **Routing:** Next.js **App Router** (`app/` directory, route groups, `route.ts` handlers). It does not use the Pages Router.
- **React:** `19.0.0` with `react-dom` `19.0.0`.
- **Language:** TypeScript, strict mode; `noUncheckedIndexedAccess`, bundler module resolution, `@/*` path alias, and Next TypeScript plugin are enabled in `tsconfig.json`.
- **Styling:** Tailwind CSS 3 with CSS custom-property design tokens in `app/globals.css`; no external component framework.

## 2. Repository structure

```text
app/
  (app)/                    authenticated application pages and shared AppShell
  (auth)/                   login/signup pages
  (status)/                 pending/rejected access pages
  api/                      App Router HTTP route handlers
  auth/callback/            Supabase email-auth callback
  globals.css, layout.tsx   global styling and fonts
components/
  layout/                   desktop sidebar and mobile bottom navigation
  ui/                       reusable Button, Card, Dialog, Field, Input, etc.
  calendar/, golf/, ...     feature UI components
db/migrations/              ordered Supabase SQL migrations
lib/
  actions/                  Next Server Actions for user-facing mutations
  auth/                     approved-user/owner authorization helpers
  supabase/                 browser, SSR-user, service-role, middleware clients
  calendar/, golf/, ...     feature domain/service code
  notifications/            outbox dispatcher and Telegram sender
types/                      hand-maintained TypeScript database/domain types
middleware.ts               global session/approval gate
```

Ignore generated/local directories such as `node_modules/`, `.next/`, `.vercel/`, and `.git/` when designing Kide.

## 3. Authentication

Authentication is Supabase Auth email/password with an additional application-level approval gate.

- Sign-in/sign-up/sign-out Server Actions: `lib/actions/auth.ts`.
- The sign-up action checks an invite-code environment variable before calling Supabase Auth.
- `app/auth/callback/route.ts` completes Supabase email confirmation/session exchange.
- `middleware.ts` calls `lib/supabase/middleware.ts` for every non-static request. It refreshes session cookies, redirects signed-out users to `/login`, and routes pending/rejected accounts to status pages.
- `lib/auth/guard.ts` is the defense-in-depth server-side guard. `requireApprovedUser()` creates the SSR client, reads the authenticated user, fetches their `profiles` row, and requires `status === "approved"`. `requireOwner()` also requires the owner role.
- Server Actions and authenticated API handlers should call `requireApprovedUser()` before reads/mutations involving user data.
- The only middleware exceptions are exact machine-to-machine paths listed in `lib/auth/machine-endpoints.ts`; those routes implement their own Bearer-secret authentication. Do not broadly exempt a future Kide API route.

Server components can create the session-scoped Supabase client directly for read-only page rendering, but mutations should retain the approved-user guard pattern.

## 4. Supabase

### Clients

- `lib/supabase/client.ts`: browser client using the public URL and public anonymous key. Safe only for client components; RLS is required.
- `lib/supabase/server.ts`: server-only SSR client using the same public credentials plus `next/headers` cookies. It is scoped to the signed-in user's session and RLS.
- `lib/supabase/middleware.ts`: cookie-aware middleware client used to refresh sessions and evaluate profile approval.
- `lib/supabase/service.ts`: server-only service-role client for cron/infrastructure RPCs. It disables session persistence and refresh. Never import it into a client component or ordinary user request merely to bypass RLS.

### Database schema and migrations

Migrations are plain SQL under `db/migrations/`; `types/database.ts` mirrors the database manually and must be updated with a new Kide table/RPC.

Current migrations and main tables:

- `0001_init.sql`: `profiles`, `trips`, `trip_ai_outputs`, `ai_cost_logs`, `app_settings`.
- `0002_approval_gate.sql` and `0003_fix_owner_bootstrap.sql`: profile approval/roles plus `is_owner` and `is_approved` security-definer functions.
- `0004_calendar.sql`: `calendar_connections`, `calendar_events`.
- `0005_golf_rate_limit.sql`: rate-limit bucket table and RPC.
- `0006_golf_watches.sql`: `golf_watches`, `notification_outbox`, watch claim/completion RPCs.
- `0007_notification_dispatch.sql`: outbox lease/claim support.
- `0008_player_watches.sql`: `player_watches`, `player_watch_matches`, player-watch claim/match RPCs.
- `0009_player_watch_telegram_dispatch.sql`: includes player-watch events in notification claims.

### RLS and access patterns

- User-owned tables use RLS policies around `auth.uid() = user_id`.
- Creation/updates for user data also generally require `public.is_approved(auth.uid())`.
- Profiles allow self access and owner management; a trigger prevents users from escalating profile role/status.
- `notification_outbox` is intentionally service-role-only; no anon/authenticated grants.
- Cron claim/complete functions are `security definer`, narrowly granted to `service_role`, and use leases plus `FOR UPDATE SKIP LOCKED` for concurrent-safe work claiming.
- Page/query helpers such as `lib/calendar/queries.ts` and `lib/trips/queries.ts` use the SSR user client. Domain workers such as golf watches use the service client.

### Secret/encrypted storage

There is **no general encrypted credential/token storage pattern** in the current schema. Existing third-party credentials are environment variables, not database columns. The calendar connection table stores only state/metadata; the Airbnb feed URL remains server environment configuration.

If Kide requires per-user OAuth refresh tokens, do not store them as plain text by copying an existing pattern: none exists. Add an explicit encrypted/managed-secret design, retention policy, RLS, and rotation/revocation behavior first.

## 5. Existing pages and navigation

Authenticated pages live in `app/(app)/` and are wrapped by `app/(app)/layout.tsx`, which renders `components/layout/AppShell.tsx`.

Current main pages include Dashboard, Inbox, Conversations, Calendar, Golf, Settings, and legacy Trips routes. The visible primary navigation is defined once in `components/layout/nav-items.tsx` and rendered by both:

- `components/layout/Sidebar.tsx` on desktop.
- `components/layout/BottomTabs.tsx` on mobile.

To add Kide, create `app/(app)/kide/page.tsx` and add one `{ href: "/kide", label, icon }` item to `NAV_ITEMS`. That automatically makes it appear in both navigation surfaces and marks nested Kide routes active. Keep the page title/description wrapper and `font-serif` heading style used by pages such as `app/(app)/golf/page.tsx` and `app/(app)/settings/page.tsx`.

Use the local `components/ui/` primitives and Tailwind tokens (`bg-canvas`, `bg-card`, `text-text-primary`, `border-border-default`, `text-accent`, etc.). Prefer feature components in `components/kide/` rather than adding a UI library.

## 6. Backend architecture

### Route handlers

HTTP endpoints are App Router handlers under `app/api/**/route.ts`. Examples:

- Conversations: `app/api/conversations/*`.
- Golf normal search, player search, watches, and personal reservations: `app/api/golf/*`.
- ElevenLabs machine endpoint: `app/api/elevenlabs/golf-search/route.ts`.
- Cron entrypoint: `app/api/cron/golf-watches/route.ts`.

Authenticated user routes usually catch `requireApprovedUser()` errors and return JSON with an `error` field and an appropriate status. Domain validation is generally manual TypeScript validation (there is no Zod/Yup dependency). Never expose upstream raw payloads or secrets in errors.

### Server Actions

User-facing form mutations primarily use Next Server Actions in `lib/actions/` with `"use server"`. They call `requireApprovedUser()`, run a Supabase mutation, then use `revalidatePath()` and sometimes `redirect()`. Calendar and trip actions are the best Kide page mutation examples.

### Service/integration patterns

- Server-only integration code begins with `import "server-only"` (for example `lib/elevenlabs/conversations.ts`, golf clients, Telegram sender).
- ElevenLabs is a good example of a server-only HTTP client that validates/massages provider payloads into a deliberately minimal public shape and uses `cache: "no-store"`.
- Golf is a data-first configuration plus generic client/worker pattern. Avoid per-provider conditionals in common execution paths.
- Error isolation is intentional: per-club/provider failures become partial failures where possible rather than failing unrelated work.

## 7. Vercel and background work

- `vercel.json` only declares the Next.js framework. There is no Vercel Cron configuration.
- Deployment is via the linked Vercel project / Git push to `main`.
- The background workflow currently relies on **Supabase Cron** calling `POST /api/cron/golf-watches` every five minutes. That route verifies a Bearer secret, then runs the golf-watch processor, player-watch processor, and notification dispatcher.
- Worker safety is implemented in Postgres with due timestamps, processing leases, retry/expiration state, atomic RPCs, and `SKIP LOCKED`; it is designed for serverless overlap rather than a queue product.
- The cron handler exposes a structured safe summary and logs structured events. It does not rely on a long-running Node process.

For Kide polling/watches, reuse this architecture only if periodic polling is truly required: add a dedicated due-work table and service-role claim RPC, then call a Kide processor from the existing cron orchestration or a separately authenticated, explicitly scheduled endpoint. Do not use in-memory timers.

## 8. External integrations and notifications

- **Telegram:** `lib/notifications/telegram.ts` sends messages using a server-only sender. Deterministic message templates live in `lib/notifications/telegram-message.ts`.
- **Notification outbox:** `lib/notifications/dispatcher.ts` claims pending events through an RPC and delegates delivery to `lib/notifications/delivery.ts`. Success marks the event processed with provider message ID/channel; failure is retryable up to the configured attempt limit. This is the strongest reusable pattern for a future Kide alert.
- **ElevenLabs:** server-only Conversations client in `lib/elevenlabs/conversations.ts`; its UI is `components/conversations/ConversationsView.tsx`.
- **Anthropic:** Claude client/actions are server-only in `lib/claude/` and record usage in `ai_cost_logs`.
- **Airbnb:** server-only iCal fetch/parser in `lib/calendar/ical.ts`, manually triggered through Calendar server actions.
- **WiseGolf:** generic server-only availability/player-search client, configuration, watches, rate limit, and Telegram notification flow under `lib/golf/`.

## 9. Environment variables

Only names are listed below. Do not put values in source, docs, browser code, or client-visible configuration.

| Name | Used for |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase browser, SSR, middleware, and service client base configuration. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser/SSR/middleware Supabase client. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only cron/infrastructure Supabase client. |
| `NEXT_PUBLIC_SITE_URL` | Sign-up email redirect construction. |
| `SIGNUP_INVITE_CODE` | Server-side sign-up gate. |
| `ANTHROPIC_API_KEY` | Server-only Claude client. |
| `ANTHROPIC_MODEL` | Claude model selection. |
| `ELEVENLABS_API_KEY` | Server-only ElevenLabs Conversations API. |
| `ELEVENLABS_AGENT_ID` | Conversation list/detail scoping. |
| `ELEVENLABS_GOLF_TOOL_SECRET` | Machine authentication for the ElevenLabs golf-search route. |
| `CRON_SECRET` | Machine authentication for the Supabase Cron route. |
| `TELEGRAM_BOT_TOKEN` | Server-only Telegram sender. |
| `TELEGRAM_CHAT_ID` | Server-only Telegram destination. |
| `AIRBNB_ICAL_URL` | Server-only Airbnb calendar feed. |
| `wisenetwork_session` | Server-only WiseGolf personal-reservations session cookie. |
| `HGK_WISEGOLF_ACCESS_TOKEN` | Server-only authenticated WiseGolf player search. |
| `KULLO_WISEGOLF_ACCESS_TOKEN` | Server-only authenticated WiseGolf player search. |
| `TAPIOLA_WISEGOLF_ACCESS_TOKEN` | Server-only authenticated WiseGolf player search. |
| `HIRSALA_WISEGOLF_ACCESS_TOKEN` | Server-only authenticated WiseGolf player search. |
| `PICKALA_WISEGOLF_ACCESS_TOKEN` | Server-only authenticated WiseGolf player search. |
| `MASTER_WISEGOLF_ACCESS_TOKEN` | Server-only authenticated WiseGolf player search. |
| `KEIMOLA_WISEGOLF_ACCESS_TOKEN` | Server-only authenticated WiseGolf player search. |
| `NORDCENTER_WISEGOLF_ACCESS_TOKEN` | Server-only authenticated WiseGolf player search. |
| `VUOSAARI_WISEGOLF_ACCESS_TOKEN` | Server-only authenticated WiseGolf player search. |
| `AULANKO_WISEGOLF_ACCESS_TOKEN` | Server-only authenticated WiseGolf player search. |
| `STLAURENCE_WISEGOLF_ACCESS_TOKEN` | Server-only authenticated WiseGolf player search. |
| `SHG_WISEGOLF_ACCESS_TOKEN` | Server-only authenticated WiseGolf player search. |

No Kide environment variables currently exist.

## 10. Dependencies

Relevant runtime dependencies:

- `next`, `react`, `react-dom`: application framework.
- `@supabase/ssr`, `@supabase/supabase-js`: auth/session-aware and service Supabase clients.
- `@anthropic-ai/sdk`: Claude integration.
- `node-ical`: Airbnb calendar feed parsing.
- `date-fns`: UI/date formatting and date calculations.
- `lucide-react`: navigation and UI icons.
- `clsx`: class name composition (`lib/utils/cn.ts`).
- `server-only`: compile/runtime boundary marker for server-only modules.

There is no dependency for a validation framework, encryption, Redis, queue/workflow engine, Telegram SDK, or Kide SDK. Telegram uses native `fetch`; validation is hand-written.

## 11. Coding conventions

- TypeScript files use `.ts`/`.tsx`, strict typing, named exports, and the `@/` alias for app imports. Some node tests import sibling TypeScript files with explicit `.ts` extensions.
- Page components are server components by default. Add `"use client"` only to interactive UI components using hooks, browser fetch, or event handlers.
- Put external HTTP/provider code in server-only `lib/<provider>/` modules; do not call provider APIs directly from client components.
- Use `components/<feature>/` for feature UI and `components/ui/` for reusable controls.
- Server Actions use `"use server"`, validate form values manually, call the approved-user guard, mutate via the SSR client, then revalidate.
- API routes return JSON. Most use `{ error: string }` for errors; successful shapes are feature-specific. Keep Kide response contracts narrow and normalized.
- Manual validation uses regex/type guards/date checks; do not assume a validation library exists.
- Styling is Tailwind with semantic tokens, compact inline JSX in a number of components, `Card` surfaces, violet `accent` actions, and `font-serif` page headings.
- Tests use Node's built-in `node:test` and `assert`, run through TypeScript stripping in local practice. Relevant tests sit next to their modules as `*.test.ts`.

## 12. Recommended Kide.app integration points

Do not implement these until Kide API/auth/data requirements are confirmed.

1. **Page/UI:** create `app/(app)/kide/page.tsx`; compose client-side interactive pieces under `components/kide/`. Add the nav item in `components/layout/nav-items.tsx`.
2. **Provider client:** add `lib/kide/client.ts` with `import "server-only"`. It should own provider fetches, `no-store` policy where data is personalized, provider error normalization, and a minimal Kide domain model. It should never return raw provider payloads.
3. **User data access:** add `lib/kide/queries.ts` for SSR/RLS reads and `lib/actions/kide.ts` for approved-user mutations. Use `requireApprovedUser()` at mutation boundaries.
4. **Schema:** add an ordered migration under `db/migrations/` and matching `types/database.ts` entries. Use `user_id`, RLS, and approval-gated write policies like calendar connections/events. If Kide credentials are user-specific, design secure encrypted storage first rather than adding a plaintext token column.
5. **Background/watch behavior:** if Kide needs tracking, model it after `golf_watches`/`player_watches`: due/lease/status fields, service-role-only claim RPC, idempotent match/outbox write, and `notification_outbox` events. Reuse the Telegram dispatcher rather than calling Telegram from the Kide poller.
6. **Notifications:** introduce a distinct event/source type and deterministic formatter in `lib/notifications/telegram-message.ts`; extend the outbox claim migration deliberately. Preserve existing event handling and retries.
7. **API handlers:** only add `app/api/kide/*` if client-side fetch is necessary. Keep session auth intact; never add `/api`-wide middleware exemptions. Machine endpoints require their own exact secret validation.

## 13. Important files

| Path | Why it matters |
| --- | --- |
| `app/(app)/layout.tsx` | Wraps every authenticated page in the app shell. |
| `components/layout/nav-items.tsx` | Single source of visible desktop/mobile navigation entries. |
| `components/layout/AppShell.tsx` | Authenticated desktop/mobile page layout. |
| `components/ui/Button.tsx` and `components/ui/Card.tsx` | Primary reusable UI patterns. |
| `middleware.ts` | Global session gate entrypoint. |
| `lib/supabase/middleware.ts` | Session refresh and approval routing. |
| `lib/auth/guard.ts` | Required approved-user/owner authorization pattern. |
| `lib/supabase/client.ts` | Browser Supabase client pattern. |
| `lib/supabase/server.ts` | SSR user/RLS Supabase client pattern. |
| `lib/supabase/service.ts` | Server-only service-role pattern for workers/RPCs. |
| `db/migrations/0004_calendar.sql` | Best pattern for user-owned external connection/state tables. |
| `db/migrations/0006_golf_watches.sql` | Best pattern for watches, idempotency, outbox and cron-safe work. |
| `types/database.ts` | Manual TypeScript DB contract that new migrations must update. |
| `lib/actions/calendar.ts` | Approved-user Server Action plus external sync/upsert pattern. |
| `lib/calendar/ical.ts` | Server-only external-feed and safe-error example. |
| `lib/notifications/dispatcher.ts` | Existing outbox delivery integration point. |
| `lib/notifications/delivery.ts` | Retry/processed delivery state machine. |
| `lib/notifications/telegram-message.ts` | Deterministic channel message templates. |
| `app/api/cron/golf-watches/route.ts` | Existing authenticated background-job entrypoint. |
| `lib/golf/watches.ts` and `lib/golf/player-watches.ts` | Due-work, lease, deduplication and notification-outbox examples. |
| `.env.example` | Names-only documentation for server/client configuration. |

## 14. Risks and unknowns

- Kide API capabilities, auth model, webhook support, rate limits, data ownership, and terms of use are not represented in this repository. Confirm them before selecting polling, webhooks, or token storage.
- There is no existing encrypted per-user provider-token store. A Kide OAuth design needs new security work; a global server token is simpler but changes ownership/visibility assumptions.
- The application has both server actions and JSON route handlers. Pick one intentionally per Kide interaction; do not duplicate validation or bypass RLS with the service client.
- The global middleware protects almost all routes. Any new machine endpoint must be a narrow allowlist exception and authenticate itself.
- Background jobs are Supabase-Cron-triggered and database-lease-based; Vercel Cron is deliberately not configured. A Kide scheduler must fit that operational model or be explicitly introduced.
- Existing migrations are applied externally to Supabase; a repository migration alone does not change production schema.
- `types/database.ts` is hand-maintained, so a missing update can produce compile-time mismatch or unsafe casts.
- Current public navigation has several legacy page routes that are not all displayed. Add Kide to `NAV_ITEMS`, not by copying a hidden legacy route.
- No generic test script is defined in `package.json`; use relevant `node:test` files plus `npm run lint`, `npm run typecheck`, and `npm run build` when implementing Kide.
