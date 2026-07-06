# Deployment — first Vercel deploy

A step-by-step checklist for shipping this app for the first time. For local
dev setup and the private-access-control design, see `SETUP.md` — this file
is specifically about getting to a working production deployment.

## 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin <your-github-repo-url>
git push -u origin main
```

`.gitignore` already excludes `.env`, `.env.local`, `.env*.local`, and
`.env.local.txt` — double-check `git status` before the first commit shows no
`.env.local` file staged.

## 2. Import into Vercel

1. In Vercel, **Add New → Project**, import the GitHub repo.
2. Framework preset: Next.js (auto-detected).
3. Don't deploy yet — add environment variables first (next section).

## 3. Required Vercel environment variables

Set these under Project Settings → Environment Variables, for both
**Production** and **Preview** (use the same Supabase project for both unless
you deliberately want a separate staging project):

| Variable | Value | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | your Supabase project URL | public, safe in client bundle |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your Supabase anon/public key | public, safe in client bundle |
| `ANTHROPIC_API_KEY` | your Anthropic API key | **server-only**, never exposed to the browser |
| `ANTHROPIC_MODEL` | e.g. `claude-sonnet-5-20251001` | server-only default model |
| `SIGNUP_INVITE_CODE` | a long random string you choose | **server-only**, required for signup to succeed at all |
| `NEXT_PUBLIC_SITE_URL` | your production URL, e.g. `https://your-app.vercel.app` | used to build the signup email-confirmation link |
| `SUPABASE_SERVICE_ROLE_KEY` | your Supabase service role key | **not required at runtime** — see below |

**On `SUPABASE_SERVICE_ROLE_KEY`:** the app never imports it anywhere in
application code — every query goes through the anon key + Row Level
Security, scoped by the signed-in user's session cookie. You can add it to
Vercel now for future one-off admin scripts, or leave it out entirely; either
way, it must never be referenced from a file without a clear server-only
boundary (see `SETUP.md`).

No other environment variables are required. `NEXT_PUBLIC_*` variables are
the only ones bundled into client-side code — everything else stays
server-side by Next.js convention plus the `"server-only"` import guards
already in `lib/claude/*`, `lib/supabase/server.ts`, `lib/cost/*`, and
`lib/auth/guard.ts`.

## 4. Run the Supabase SQL migrations, in order

In the Supabase SQL Editor, run these **once each, in this exact order**:

1. `db/migrations/0001_init.sql`
2. `db/migrations/0002_approval_gate.sql`
3. `db/migrations/0003_fix_owner_bootstrap.sql`

These are not idempotent (`create policy` and `add constraint` fail if run
twice) — that's intentional for a one-shot migration file, not a bug. If a
run partially fails partway through, read the error to see which statement
failed, fix only that statement, and continue rather than re-running the
whole file.

After all three have run, `profiles` has `status`/`role`/`approved_by`/
`approved_at`/`rejected_at`, RLS is enabled on all five tables, every
insert/update on `trips`, `trip_ai_outputs`, `ai_cost_logs`, and
`app_settings` requires an approved account, and the first-owner bootstrap
snippet in step 7 below will actually take effect (it silently no-ops
without `0003` — see that file's header comment for why).

## 5. Supabase Auth URL configuration

Under Authentication → URL Configuration:

- **Site URL**: your production Vercel URL (e.g. `https://your-app.vercel.app`)
- **Redirect URLs**, add both:
  - `https://your-app.vercel.app/auth/callback`
  - `http://localhost:3000/auth/callback` (keeps local dev working)

Under Authentication → Providers, confirm **Email** is enabled.

## 6. Deploy

Trigger the deploy in Vercel (push to `main`, or click Deploy). Confirm the
build succeeds — it should match the local `npm run build` output described
in the verification section below.

## 7. Make the first user the owner

1. Visit the production URL, go to `/signup`, sign up with the invite code
   you set in `SIGNUP_INVITE_CODE`. The account lands on `/pending-approval`
   — expected, since no owner exists yet.
2. In the Supabase SQL Editor:

   ```sql
   update public.profiles
   set role = 'owner', status = 'approved', approved_at = now()
   where email = 'you@example.com';
   ```

3. Sign in again. You should land on `/dashboard` with a "Manage users" link
   under Settings.

## 8. Production smoke test

Work through this list on the live URL after deploy:

1. Open the production URL — redirects to `/login` when signed out.
2. Sign up with a **wrong** invite code — fails with an "Invalid invite code"
   error, no account is created that can sign in.
3. Sign up with the **correct** invite code — account is created and lands
   on `/pending-approval`.
4. Make that first user the owner via the SQL snippet above (step 7).
5. Log in as the owner — lands on `/dashboard`.
6. Open `/settings/users` — loads (owner-only page).
7. Approve a pending user (create a second test signup first if you want to
   verify the pending → approved flow end-to-end).
8. Create a trip from `/trips`.
9. Open the trip, go to **Raw plan**, paste a freeform travel plan, save it.
10. Click **Parse plan**.
11. In Supabase, confirm a new row exists in `trip_ai_outputs` with
    `type = 'structured_plan'` for that trip.
12. In Supabase, confirm a new row exists in `ai_cost_logs` with
    `feature = 'parse_plan'` and non-zero token counts.
13. Open `/costs` and confirm the run shows up with an estimated cost.

If any step fails, check the Vercel function logs first (most likely causes:
a missing env var, or the SQL migrations not having been run yet).

## Verification run (this pass)

- `npm run lint` — clean, no warnings or errors.
- `npm run typecheck` — clean.
- `npm run build` — succeeds. One non-blocking warning is expected and safe
  to ignore:

  ```
  A Node.js API is used (process.version at line: 27) which is not supported
  in the Edge Runtime.
  Import trace: @supabase/supabase-js -> @supabase/ssr's createBrowserClient
  -> @supabase/ssr/index -> lib/supabase/middleware.ts
  ```

  `@supabase/ssr` has a single entry point that re-exports both
  `createServerClient` and `createBrowserClient`, so importing either one
  pulls in the full `@supabase/supabase-js` module graph for Next's Edge
  bundler static analysis — even though middleware only calls
  `createServerClient`. The flagged `process.version` reference in
  `supabase-js` is defensively guarded
  (`typeof process !== 'undefined' ? process.version?.replace(...) : undefined`),
  so it degrades to `undefined` rather than throwing on Vercel's Edge
  Middleware runtime, which does provide a minimal `process` global. This is
  a widely-reported, known-benign warning for Supabase + Next.js projects and
  does not block build or deploy.

## Files changed in this deployment-readiness pass

None. This pass was verification and documentation only — no application
code was changed. The only new file is this one (`DEPLOYMENT.md`).
