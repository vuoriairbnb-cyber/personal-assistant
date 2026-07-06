# Setup — Personal Assistant

Project documentation. `README.md` in this repo holds the visual design system
(colors, type, spacing, components) authored separately — this file covers
running and deploying the actual application.

## Stack

Next.js App Router (TypeScript) · Tailwind CSS · Supabase (Postgres + Auth) ·
Anthropic Claude API · deployed on Vercel.

## 1. Environment variables

Copy `.env.example` to `.env.local` and fill in real values:

| Variable | Where it's used | Exposure |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key | public |
| `SUPABASE_SERVICE_ROLE_KEY` | reserved for future server-only admin scripts | **server-only, unused by the app today** |
| `ANTHROPIC_API_KEY` | Claude API calls | **server-only** |
| `ANTHROPIC_MODEL` | default model id if a user has no saved preference | server-only |
| `NEXT_PUBLIC_SITE_URL` | builds the signup email-confirmation redirect | public |
| `SIGNUP_INVITE_CODE` | required to complete signup at all | **server-only** |

`.env.local` is git-ignored. Never commit real keys. The app currently never
imports `SUPABASE_SERVICE_ROLE_KEY` anywhere — all data access goes through
the anon key + Postgres Row Level Security, scoped to the signed-in user via
their session cookie (`lib/supabase/server.ts`). The service key is provided
for future one-off admin tooling only; if you add a script that uses it,
keep it out of any file reachable from a Client Component.

## 2. Supabase project

1. Create a project at supabase.com.
2. In the SQL editor, run, **in this exact order**:
   `db/migrations/0001_init.sql`, then `db/migrations/0002_approval_gate.sql`,
   then `db/migrations/0003_fix_owner_bootstrap.sql`. Together they create:
   - `profiles`, `trips`, `trip_ai_outputs`, `ai_cost_logs`, `app_settings`
   - a trigger that creates a `profiles` row on signup (defaulting to
     `status = 'pending'`, `role = 'user'`)
   - Row Level Security policies scoping every table to `auth.uid()`, plus
     helper functions (`is_owner`, `is_approved`) and a trigger that blocks
     anyone but the owner from changing `status`/`role`/`approved_by`/
     `approved_at`/`rejected_at` — even on their own row
   - `0003` is a required bug fix on top of `0002`: the privilege-escalation
     trigger originally reverted changes made via the service role key or the
     SQL editor too (no JWT there means `auth.uid()` is `NULL`, so
     `is_owner(NULL)` was always false) — which silently broke the
     first-owner bootstrap snippet below. `0003` scopes the guard to only
     apply when `auth.uid()` is present (i.e. a real signed-in end user).
3. Under Authentication → Providers, enable **Email**.
4. Under Authentication → URL Configuration, set:
   - Site URL: your deployed URL (or `http://localhost:3000` for local dev)
   - Redirect URLs: add `<site-url>/auth/callback`
5. Copy the Project URL and anon public key into `.env.local`.

Google OAuth can be added later under Authentication → Providers without any
schema changes — `profiles.id` already references `auth.users(id)`.

## 3. Private access control

This app is not open signup. Every new account lands as `status = 'pending'`
and `role = 'user'`, and cannot use any module — Dashboard, Travel Planner,
Calendar, Inbox, AI Costs, Settings — until the owner approves it. This is
enforced twice: once in `middleware.ts` (redirects pending/rejected users to
`/pending-approval` / `/access-rejected`), and again inside every Server
Action and Row Level Security policy (`lib/auth/guard.ts`,
`db/migrations/0002_approval_gate.sql`), so hiding a button in the UI is never
the only thing standing between a pending account and real data.

### Invite code

Set `SIGNUP_INVITE_CODE` in `.env.local` (and in Vercel for production) to a
long random string before anyone signs up. Share it out-of-band — over
Signal, in person, whatever — never inside the app itself. Signup fails
server-side if the code doesn't match, before an auth account is even
created.

### Making the first user the owner

1. Set `SIGNUP_INVITE_CODE` and sign up for an account the normal way at
   `/signup`. It will sit in `pending` — that's expected, since no owner
   exists yet to approve it.
2. In the Supabase SQL editor, run:

   ```sql
   update public.profiles
   set role = 'owner', status = 'approved', approved_at = now()
   where email = 'you@example.com';
   ```

3. Sign in. You'll land on `/dashboard` and see a "Manage users" link under
   Settings (`/settings/users`).

This is a one-time manual step by design — there is no UI path to create an
owner, so it can't be triggered by a bug or a compromised session.

### Approving family members (or anyone else) later

1. They visit `/signup` with the invite code and create an account. It sits
   at `/pending-approval` until you act.
2. Sign in as the owner, go to **Settings → Manage users**
   (`/settings/users`).
3. Under **Pending**, click **Approve** (or **Reject**). Approved accounts
   default to `role = 'user'`; use the role dropdown next to their name to
   set `family` if you want to distinguish them later (the app doesn't yet
   branch behavior on `family` vs `user` — it's there for when it does).
4. Role can only be set to `family` or `user` from this page. Promoting
   someone to `owner` is intentionally not a button anywhere — it's the same
   one-time SQL snippet from the previous section, run manually in Supabase.

## 4. Local development

```bash
npm install
npm run dev
```

Visit `http://localhost:3000`. You'll be redirected to `/login`; use `/signup`
with the invite code from `.env.local` to create an account (Supabase sends a
confirmation email if email confirmations are enabled on the project). The
account lands on `/pending-approval` until it's approved — see
[Private access control](#3-private-access-control) above for making the
first account the owner.

## 5. Quality checks

```bash
npm run lint
npm run typecheck
npm run build
```

## 6. Deploying to Vercel

1. Import the repo into Vercel.
2. Add the same environment variables from `.env.local` in Project Settings →
   Environment Variables (set `NEXT_PUBLIC_SITE_URL` to the production URL,
   and use a fresh `SIGNUP_INVITE_CODE` if you don't want to reuse the local one).
3. Deploy. Vercel runs `next build` automatically.
4. Update the Supabase Auth redirect URL to match the production domain.

## Product safety boundaries (do not remove)

- The app never sends email automatically — email drafts are saved as
  `trip_ai_outputs` rows with `status: draft` for the user to copy or approve.
- The app never books, purchases, or pays for anything.
- The app never writes to a calendar (Calendar module is a placeholder).
- `ANTHROPIC_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are only referenced from
  files that import `"server-only"` (`lib/claude/*`, `lib/supabase/server.ts`,
  `lib/cost/*`) or from Server Actions/Route Handlers — never from a file with
  a `"use client"` directive. The same is true of `SIGNUP_INVITE_CODE`
  (`lib/actions/auth.ts`).
- No account can use any module until the owner approves it, and no account
  can become the owner except via the manual SQL snippet above — never
  through the app UI.
