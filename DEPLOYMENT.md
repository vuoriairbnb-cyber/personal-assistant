# Deployment

This is a concise deployment checklist. [README.md](README.md) is the public project overview; [SETUP.md](SETUP.md) covers local setup.

## 1. Prepare the repository

1. Review `git status` before every deploy. Do not commit `.env*`, local browser profiles, logs, or local databases.
2. Run the quality checks:

   ```bash
   npm run lint
   npm run typecheck
   npm run build
   ```

3. Apply the tracked SQL migrations in `db/migrations/` to the target Supabase project in ascending filename order. Apply only migration files present in the checkout; do not infer a missing numeric migration.

## 2. Configure Supabase

Enable email authentication and configure the deployed site URL and `/auth/callback` redirect URL in Supabase Auth.

The application uses:

- public Supabase URL and anonymous key for browser/session-scoped access protected by RLS;
- a server-only service-role client for infrastructure work such as rate limiting, cron processing, notifications, and Kide control-plane operations;
- an application-level approval gate in addition to Supabase Auth.

Keep the service-role credential server-only. It must never be exposed to browser code or committed to Git.

## 3. Configure Vercel environment variables

Start from [`.env.example`](.env.example). Add only the variables needed for enabled modules, in the appropriate Vercel environment. The base application needs Supabase settings, `NEXT_PUBLIC_SITE_URL`, and the server-only signup invite configuration. Feature modules add their own server-only provider credentials, for example OpenAI for Morning Brief, ElevenLabs for Conversations, Telegram for notifications, or WiseGolf access for authenticated player search.

Never copy secret values into documentation, build logs, client-side variables, or Git history. Only `NEXT_PUBLIC_*` variables are intended for browser exposure.

## 4. Deploy the application

1. Import the Git repository into Vercel with the Next.js framework preset.
2. Add the required environment variables before deploying.
3. Deploy the selected Git commit.
4. Confirm the Vercel build and authenticated smoke tests succeed.

The application does not use Vercel Cron. Golf watches are processed by an external Supabase Cron job that calls the protected `POST /api/cron/golf-watches` route with its server-side cron secret. Configure that scheduler only after the route, database migrations, and notification settings are ready.

## 5. Post-deploy smoke checks

- Signed-out users are redirected to the login flow.
- Pending/rejected users cannot access approved-user modules.
- An approved user can load the dashboard and enabled modules.
- Morning Brief controls remain authenticated and manually initiated; no scheduled ingestion is configured.
- Golf watch processing and Telegram delivery are tested only when their provider variables and Supabase Cron are configured.
- The ElevenLabs golf tool rejects missing or invalid bearer authentication.

## Kide scope

The Kide Chrome extension is local, unpacked experimental software. It is not deployed to Vercel, does not automate payment, and keeps its reservation action bounded to a user-armed, one-click browser interaction. The browser extension and cloud application have separate responsibilities; do not treat a Vercel deployment as a Kide purchasing deployment.
