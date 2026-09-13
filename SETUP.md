# Local setup

[README.md](README.md) describes the product and its boundaries. This guide covers a safe local development setup.

## Prerequisites

- Node.js 20+
- A Supabase project with email authentication enabled
- Provider credentials only for the feature modules you intend to run

## 1. Install and configure

```bash
npm install
cp .env.example .env.local
```

`.env.local` is local-only. Fill it with your own values and never commit it. [`.env.example`](.env.example) is the source of truth for current variable names and marks public versus server-only configuration.

Core configuration includes:

- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` for Supabase browser/session clients;
- `SUPABASE_SERVICE_ROLE_KEY` for server-only infrastructure operations;
- `NEXT_PUBLIC_SITE_URL` for auth redirects;
- `SIGNUP_INVITE_CODE` for server-side signup admission.

Other variables are optional by module: Anthropic powers trip assistance, OpenAI powers Morning Brief classification and embeddings, ElevenLabs powers Conversations and the golf tool, Telegram delivers watch notifications, and golf/calendar/benefits/Kide variables enable their respective integrations.

## 2. Database and authentication

Apply the migration files that exist in `db/migrations/` to a development Supabase project in ascending filename order. Do not assume that a numeric gap represents a missing migration: apply only files included in your checkout.

In Supabase Auth, configure your local site URL and add the local `/auth/callback` redirect URL. The app adds an approval gate on top of Supabase Auth, so a newly registered user remains pending until an owner approves it.

For a new development project, create the first approved owner through the Supabase SQL editor after signup. Use an account you control and do not put personal addresses or credentials in repository documentation.

## 3. Run locally

```bash
npm run dev
```

Open `http://localhost:3000`. Sign in through the normal approval flow. A module remains unavailable until both its server-side configuration and its database prerequisites are present.

## 4. Module boundaries

- **Morning Brief:** public-source ingestion and regeneration are authenticated, manually initiated actions; there is no scheduler.
- **ElevenLabs:** Conversations is a read-only, server-side integration. The protected golf tool has independent bearer authentication and Supabase-backed rate limiting.
- **Golf watches:** the local app can create and inspect watches; recurring processing requires an external Supabase Cron configuration and its server-only cron secret.
- **Calendar:** private iCal feed URLs are server-only bearer secrets; the app reads feeds and does not write to providers.
- **Kide:** the Chrome extension is loaded locally in normal Chrome. It is a bounded proof of concept, not a cloud-side purchasing worker, and stops before payment.

## 5. Verify changes

```bash
npm run lint
npm run typecheck
npm run build
```

Focused automated tests use Node's test runner through `tsx`; there is no catch-all `npm test` script. Run the relevant `*.test.ts` or `*.test.mjs` files for the module being modified.

## Security reminders

- Keep API keys, bearer tokens, bot credentials, iCal URLs, cookies, and service-role credentials server-only.
- Never place a real secret in `.env.example`, a test fixture, a browser bundle, logs, or Git history.
- Do not bypass the approved-user guard or broaden the machine-endpoint allowlist; machine routes must validate their own secrets.
