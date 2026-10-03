# Rayan's Tutorial — Supabase and Vercel setup

This guide prepares the existing SHSAT platform for Supabase Auth/Postgres and a free Vercel `*.vercel.app` production domain. It keeps the current design, question library, diagnostics, practice, timed mocks, review tools, and content studio.

**MANUAL ACTION REQUIRED:** A Supabase project, provider configuration, private environment values, and a real Vercel deployment still need your account setup. Google/Vercel production login has not been tested against those accounts. The old Sites deployment and its D1 database remain separate and intact.

## 1. What changed

The original project used Next.js-shaped App Router files through Vinext/Vite, deployed to Cloudflare Workers with D1 and custom password/session code. The updated deployment target is standard **Next.js 16.3.4 App Router**, React 19, Supabase Auth, Supabase Postgres, and Vercel’s Node.js runtime.

Email/password and Google accounts use Supabase Auth. The Next.js integration uses pinned `@supabase/supabase-js` **2.117.2** and `@supabase/ssr` **0.12.7**, with separate browser/server clients, cookie refresh through `proxy.ts`, and a PKCE callback. Use **Node.js 22.x**, version 22.13.0 or newer within that release line. The application does not need a paid custom domain or a Supabase service-role key.

The code targets the existing SHSAT user experience. Supabase owns passwords; the application owns profiles and SHSAT progress associated with the verified Auth UUID. No mandatory verification-code, forgot-password, reset-password, magic-link, or phone-login UI is added.

## 2. Files created

The central new integration files are:

- `lib/supabase/client.ts`: browser client.
- `lib/supabase/server.ts`: server client and cookie adapter.
- `lib/supabase/proxy.ts` and root `proxy.ts`: session refresh and protected navigation.
- `lib/supabase/config.ts`: configuration validation.
- `lib/auth/handlers.ts`: email signup, login, logout and auth API responses.
- `lib/auth/user.ts`: verified identity and repeatable profile creation.
- `lib/auth/redirects.ts`: safe internal destinations and production/preview origins.
- `app/auth/callback/route.ts`: Google PKCE code exchange.
- `app/auth-landing.tsx`, `app/login/page.tsx`, `app/signup/page.tsx`: existing landing/auth UI connected to dedicated auth routes.
- `app/(protected)/layout.tsx`: server-side authentication for dashboard, practice, diagnostic, mock, results, profile, mistakes, mastery, analytics and admin page routes.
- `db/statements.ts`: compatibility layer for the existing assessment database operations.
- `supabase/migrations/202610020001_platform.sql`: Supabase schema, triggers, permissions and RLS.
- `scripts/seed.ts` and `scripts/import-legacy.ts`: `pnpm db:seed` and `pnpm db:import-legacy` initialize content and import explicitly mapped historical data.
- `tests/database.test.ts`, `tests/assessment.test.ts`, `tests/redirects.test.ts`: local database, assessment, deadline, and redirect checks.
- `app/error.tsx`: friendly retry state when sign-in/progress services are unavailable.
- `vercel.json`: Vercel deployment configuration.
- This deployment guide, also supplied separately as `rayans-tutorial-setup.md`.

The protected route wrappers are `app/(protected)/dashboard/page.tsx`, `practice/page.tsx`, `diagnostic/page.tsx`, `mock/page.tsx`, `results/page.tsx`, `profile/page.tsx`, `mistakes/page.tsx`, `mastery/page.tsx`, `analytics/page.tsx`, and `admin/page.tsx` within that same route group. Use the new Supabase migration below for this deployment.

## 3. Files modified

The integration updates the project’s package/build configuration, environment template, server database adapter, existing authentication components, Google button, dashboard navigation and shared API service. The original learning engine and authored content remain the basis of the platform.

Modified integration files include `eslint.config.mjs`, `lib/math.ts` (declaration cleanup), `app/studio.tsx` (safe initial loading), and `package.json`, `pnpm-lock.yaml`, `next.config.ts`, `tsconfig.json`, `.env.example`, `.gitignore`, `db/index.ts`, `lib/library.ts`, `lib/service.ts`, `app/api/studio/[...path]/route.ts`, `app/landing.tsx`, `app/platform.tsx`, `app/page.tsx`, and `app/globals.css`.

`db/index.ts` uses server-only Postgres transactions; existing assessment operations keep their SQL-style interface. Auth-related UI/API changes preserve the current layout while adding name/confirmation validation, loading states, safe errors, Google authorization, protected routes and logout. `.env.example` lists placeholders; `.gitignore` excludes filled environment files and private local state. The local Sites/Worker/Vite scaffolding and old custom credential integration are removed from the Vercel target; this does not alter the already hosted Sites/D1 deployment.

## 4. Database changes

Run **`supabase/migrations/202610020001_platform.sql` once in a new intended Supabase project**. It creates `profiles` linked to `auth.users.id`, plus `passages`, `questions`, `test_sessions`, `answers`, `question_exposure`, `results`, `mistakes`, `mock_tests`, `content_batches`, and `rate_limits`.

Profiles hold email, display name, avatar, protected student/admin role and timestamps. Auth triggers initialize profiles and synchronize display information without overwriting established progress. Repeated login ensures the same row exists rather than generating another profile.

The server’s non-login, `NOBYPASSRLS` **`rayan_app`** role operates inside transactions with claims derived from a verified Supabase user. `auth.uid()` policies enforce student ownership. Browser permissions allow appropriate own-record reads and display-field updates; grading, answer-key storage, role changes and question-bank edits remain protected server operations. The sanitized question catalog exposes approved question metadata rather than answer keys. [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).

The old D1 database is not automatically copied. Historical progress needs an exported dataset and an owner-verified mapping from old UUIDs to new Supabase Auth UUIDs. See section 7 before moving existing students.

## 5. Authentication flow

**Email signup:** the existing form validates name, email, password length and matching confirmation, calls Supabase Auth, ensures a profile and opens the dashboard after a session is received. Disable **Confirm email** as described below so the account is immediately usable.

**Email login:** Supabase verifies credentials, writes session cookies and opens the dashboard. Invalid credentials show a safe message such as “Incorrect email or password.” App code does not store or hash these passwords.

**Google signup/login:** “Continue with Google” calls `signInWithOAuth({ provider: 'google' })`. Google returns to Supabase’s provider callback; Supabase then returns to the app’s `/auth/callback`. The app exchanges the code with `exchangeCodeForSession`, verifies the user, ensures their profile and redirects to the dashboard or an approved internal destination.

**Refresh and protection:** browser/server clients use Supabase cookies. Next.js 16 `proxy.ts` refreshes tokens and carries refreshed cookies and cache headers into the response. Protected API operations independently verify the user. Login/signup can redirect an already signed-in student to their dashboard. Logout signs out and returns to a public page; protected pages become unavailable. [Current Supabase SSR approach](https://supabase.com/docs/guides/auth/server-side/creating-a-client).

## 6. Environment variables needed

Copy `.env.example` to a private `.env.local` in the repository folder. Fill your own values:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR-SUPABASE-PUBLISHABLE-KEY
NEXT_PUBLIC_SITE_URL=http://localhost:3000
SUPABASE_DB_URL=YOUR-PRIVATE-TRANSACTION-POOLER-URI
# Optional server-only project CA, if Node reports an untrusted certificate chain:
SUPABASE_DB_SSL_CA=
# Optional, only for the existing administrator activation flow:
ADMIN_SETUP_TOKEN=YOUR-PRIVATE-RANDOM-ADMINISTRATOR-CODE
```

| Variable | Local development | Vercel production | Vercel type |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | Production Supabase project URL | Config |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | That project’s publishable key | Production project’s publishable key | Config |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | Actual `https://…vercel.app` production origin | Config |
| `SUPABASE_DB_URL` | Private transaction-pooler URI | Production database URI | Secret |
| `SUPABASE_DB_SSL_CA` | Optional downloaded project CA in PEM form | Same trusted project CA when required | Server-only Secret |
| `ADMIN_SETUP_TOKEN` | Optional private activation code | Optional private activation code | Secret |

The browser needs the public Supabase URL and publishable key. **`SUPABASE_DB_URL` is server-only** and enables atomic assessment grading/finalization and related progress updates. On Vercel’s native Supabase integration, the same shared transaction-pooler URI is also available as `POSTGRES_URL`; the server adapter accepts that integration name automatically, while `SUPABASE_DB_URL` remains the explicit/manual override. These variables include a database credential; never prefix them with `NEXT_PUBLIC_`, place them in frontend code, or commit them. Runtime student transactions assume the restricted app role and RLS; setup/import commands are owner operations. No service-role key is used.

The Google client secret belongs directly in Supabase’s Google provider settings. It does not belong in Vercel or any source file. `.env` and `.env.local` are ignored; `.env.example` has placeholders only.

## 7. Supabase setup steps you must perform

### Create the project and copy API configuration

1. Open [Supabase Dashboard](https://supabase.com/dashboard), sign in, and click **New project**.
2. Select your organization, use its free plan, enter **Rayan's Tutorial**, choose a region, and save a strong database password privately.
3. Click **Create new project** and wait until it is ready.
4. Click **Connect** at the top of the project. Copy its **Project URL** and **Publishable key**. If locating a key separately, use **Settings → API Keys**. Use the current `sb_publishable_…` key, not a secret or legacy service-role key. [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys).

### Apply the new schema

1. Open **SQL Editor → New query**.
2. Copy the complete contents of `supabase/migrations/202610020001_platform.sql` from the updated repository into the query.
3. Click **Run**. Check the result before continuing. This migration is for the new Supabase schema; do not replay it on an already initialized database or substitute the old `drizzle/` D1 migrations.
4. In **Table Editor**, confirm `profiles` and the SHSAT tables exist. Resolve errors by inspecting the migration; keep RLS enabled.

### Copy the transactional server connection

1. Click **Connect → Transaction pooler**.
2. Copy the full URI Supabase shows. Replace `[YOUR-PASSWORD]` with the saved database password; percent-encode reserved characters such as `#`, `?`, `&`, and spaces.
3. Keep the exact host, username and port from the dialog. The shared transaction pooler normally uses port `6543`; its host cannot be inferred reliably from your region.
4. Save that URI privately as `SUPABASE_DB_URL` locally and as a Vercel **Secret**. If the project is connected through Vercel’s native Supabase integration, its `POSTGRES_URL` transaction-pooler value is accepted automatically, so no duplicate secret is needed.

The shared pooler supports serverless connections on the free Supabase plan. The adapter holds each verified-user transaction on one connection and avoids named prepared statements. [Database connection guidance](https://supabase.com/docs/guides/database/connecting-to-postgres), [prepared-statement settings](https://supabase.com/docs/guides/troubleshooting/disabling-prepared-statements-qL8lEL).

If Node reports `SELF_SIGNED_CERT_IN_CHAIN` or another untrusted certificate-chain error, open your project's **Database Settings → SSL Configuration → Download certificate**. Save the downloaded trusted CA certificate privately as the server-only `SUPABASE_DB_SSL_CA` environment variable locally and in Vercel. Supply the full PEM contents, including `BEGIN CERTIFICATE` and `END CERTIFICATE` boundaries. Multiline PEM works; a single-line environment value may use literal `\n` for each newline. Do not supply a file path or a Google credential. Restart the local server and redeploy Vercel after changing the value.

Leaving `SUPABASE_DB_SSL_CA` empty uses Node's default trust store. When supplied, the driver uses that CA with `rejectUnauthorized: true` and retains the default hostname check. Malformed PEM configuration is rejected; there is no fallback that disables verification. The adapter removes URL SSL options so they cannot overwrite the explicit TLS configuration. [Supabase SSL certificate guidance](https://supabase.com/docs/guides/database/connecting-to-postgres#ssl), [node-postgres SSL configuration](https://node-postgres.com/features/ssl).

### Disable mandatory email confirmation

1. Open **Authentication → Sign In / Providers**.
2. Keep **Allow new users to sign up** enabled.
3. Open **Email**, keep email/password enabled, switch **Confirm email** off, then click **Save**.
4. Reopen Email and verify the saved setting is off.

New password signups then receive a session immediately. If confirmation remains on, an account can be created without a usable session; the application reports a configuration issue rather than pretending the student is logged in. [Supabase general configuration](https://supabase.com/docs/guides/auth/general-configuration), [password signup](https://supabase.com/docs/guides/auth/passwords).

### Seed content and start locally

From the updated repository, with Node.js 22.x (22.13.0 or newer) and pnpm installed:

```sh
pnpm install --frozen-lockfile
pnpm db:seed
pnpm dev
```

Configure `.env.local` and apply the schema first. Visit `http://localhost:3000`. Seeding initializes the existing question bank; do not run it on every login or every Vercel build. Check its summary and the seeded tables.

### First administrator

If you use the optional activation flow, configure a private random `ADMIN_SETUP_TOKEN` locally/in Vercel, sign into your own normal account, and open **Account → Content studio access** to enter that code. Share it only with intended administrators.

Alternatively, an owner can promote the intended Auth UUID in Supabase **SQL Editor**. Open **Authentication → Users**, inspect your own account, and copy its UUID before running:

```sql
update public.profiles
set role = 'admin', updated_at = now()
where id = 'YOUR-VERIFIED-SUPABASE-AUTH-UUID';
```

Verify the intended row afterward, then sign in again or refresh the account view. Do not infer the identity from a student-provided UUID or add an unrestricted browser role-update grant.

### Preserve existing students’ historical progress

**MANUAL ACTION REQUIRED:** Export old Sites/D1 records privately before a migration. The old deployment continues to use its own database until you deliberately change it.

1. Export app records, excluding custom password hashes, salts and session tokens.
2. Have each existing student establish a Supabase Auth account. The new Auth UUID may differ from their old UUID.
3. Create an owner-verified mapping from every old UUID to the correct new Auth UUID. Do not link accounts solely by a browser claiming an email address.
4. Inspect `pnpm db:import-legacy --help`. Its export is a JSON object containing table-name arrays; its mapping is an explicit object such as `{"OLD-USER-UUID":"NEW-SUPABASE-AUTH-UUID"}`. Every mapped destination must already exist in Supabase Auth, and distinct old users must have distinct target UUIDs. Keep both files private and outside the Git-tracked source.
5. Test with a disposable destination first. For the intended destination, run `pnpm db:import-legacy migration-input/legacy.json migration-input/user-map.json` using your own private file paths. The script validates inputs and imports an atomic batch, rolling back on failure. Existing content/session IDs are retained and conflicting content/progress rows are left in place.
6. Verify row counts, sample attempt answers/results and ownership before redirecting students. The import updates mapped profiles' original creation times and student/admin roles from the trusted export; review administrator mappings carefully. It leaves the new Supabase Auth credentials in place and rejects credential-bearing profiles or legacy session exports.

`pnpm db:seed` initializes question-bank content; it does not import students. Review the import’s output before moving existing students to the Vercel link.

## 8. Google OAuth setup steps you must perform

The existing Web client is already created:

| Setting | Existing value |
|---|---|
| Google Cloud project | `cosmic-slate-441822-h2` |
| OAuth client name | **Rayan's Tutorial Web** |
| Client type | **Web application** |
| Public client ID | `686092047504-q7q87movaute45ugbs09jv83fcir0in7.apps.googleusercontent.com` |

Use this existing client. The client ID is public; the secret is private and must be copied directly from Google to Supabase.

### Branding, audience and basic scopes

1. Open [Google Auth Platform](https://console.cloud.google.com/auth/overview?project=cosmic-slate-441822-h2) and select **cosmic-slate-441822-h2** in the project picker.
2. Open **Branding**. Verify app name **Rayan's Tutorial**, your user support email and developer contact email; save.
3. Open **Audience**. Use **External** for students outside your Workspace organization. While testing, use **Test users → Add users → Save** for your Google test accounts. When ready for intended students, use the audience’s publishing control and follow any requirements Google displays.
4. Open **Data Access → Add or remove scopes**. Select only `openid`, `https://www.googleapis.com/auth/userinfo.email`, and `https://www.googleapis.com/auth/userinfo.profile`. Save. No Gmail or Drive permission is needed. [Current Google consent interface](https://developers.google.com/workspace/guides/configure-oauth-consent).

If starting with a new project instead, select/create it in Google Cloud, then use **Google Auth Platform → Branding → Get Started** for app information, audience, contact information and policy review. Create credentials through **Clients → Create client → Web application**. This project's existing client normally makes those creation steps unnecessary. [Google Web OAuth setup](https://developers.google.com/identity/protocols/oauth2/web-server).

### Update origins and add Supabase’s exact callback

1. Open **Supabase → your project → Authentication → Sign In / Providers → Google**.
2. Find **Callback URL** and click **Copy**. Use the exact URL shown; it normally resembles `https://PROJECT-REF.supabase.co/auth/v1/callback`.
3. Open **Google Auth Platform → Clients → Rayan's Tutorial Web**.
4. Under **Authorized JavaScript origins → Add URI**, enter `http://localhost:3000` and your actual production origin, `https://ACTUAL-VERCEL-DOMAIN`. Origins contain no path or trailing callback. Existing old-Site/port-5173 entries do not configure the new origin.
5. Under **Authorized redirect URIs → Add URI**, paste the exact Supabase callback copied in step 2; click **Save**.
6. Return to Supabase’s Google provider, enable Google, paste the existing client ID and its private client secret into their fields, then **Save**.

Google’s Authorized redirect URI is the **Supabase callback**, while the website’s `/auth/callback` belongs in Supabase’s app redirect allow list. The secret stays in Supabase. [Supabase Google provider instructions](https://supabase.com/docs/guides/auth/social-login/auth-google).

Google only shows a new secret once. If the creation dialog is still open, copy it directly into Supabase. If it was not securely saved, open the client’s secret controls, create a replacement, and update Supabase before retiring a previously used secret. Do not paste secrets into chat, source or GitHub. [Google OAuth secret management](https://support.google.com/cloud/answer/15549257).

## 9. Vercel setup and deployment steps you must perform

1. Confirm the completed implementation is in [r4yan2wavy/Rayan-s-Tutorial](https://github.com/r4yan2wavy/Rayan-s-Tutorial) on the branch you will deploy.
2. Sign into [Vercel](https://vercel.com/) with GitHub and choose its free Hobby plan.
3. Click **Add New → Project**.
4. Under **Import Git Repository**, select **r4yan2wavy/Rayan-s-Tutorial → Import**. If missing, use **Adjust GitHub App Permissions** to allow Vercel access to this repository.
5. Choose a project name. Use **Framework Preset: Next.js** and the repository root as **Root Directory**. Use pnpm from the committed lockfile, build command `pnpm build`, and the default Next.js output directory. Select **Node.js 22.x** if a runtime setting is offered; it matches `package.json`.
6. Add the four required environment values from section 6. Also add **ENABLE_EXPERIMENTAL_COREPACK=1** for Production/Preview so Vercel uses the committed `packageManager` value `pnpm@11.19.0`. Leave the install-command override unset for automatic detection. [Vercel package manager configuration](https://vercel.com/docs/package-managers). Choose the intended `https://…vercel.app` origin for your selected project name initially; do not test authentication until you verify the actual assigned domain below. Add `ADMIN_SETUP_TOKEN` only if you want the administrator activation flow.
7. Click **Deploy**. Wait for a successful/Ready deployment; inspect build logs if it fails.
8. Open **Settings → Domains** and copy the actual production `*.vercel.app` domain.

Vercel assigns a domain based on your project name and availability. `https://rayans-tutorials.vercel.app` is an example, not a verified assigned address. No custom-domain purchase is required. [Vercel Git import](https://vercel.com/docs/git), [free assigned deployment domains](https://vercel.com/docs/domains/working-with-domains).

### Environment scopes and redeployment

Open **Project → Settings → Environment Variables**. For every variable select its type and scopes before saving:

- **Production:** use production Supabase values and actual production `NEXT_PUBLIC_SITE_URL`. Store the database URI and optional admin token as **Secret**.
- **Preview:** use a deliberately configured test Supabase project/database, or share the production project only if you intend preview activity to use its data. The public URL/key and database URI must all target the same project. Keep `NEXT_PUBLIC_SITE_URL` stable; preview auth uses Vercel’s generated deployment origin.
- **Development:** use your local/test project's values and `NEXT_PUBLIC_SITE_URL=http://localhost:3000`.

Changes apply to new deployments. After changing values, open **Deployments → latest deployment’s menu → Redeploy**, or push a new commit. Google’s client secret is not duplicated in Vercel. [Vercel environment types and scopes](https://vercel.com/docs/environment-variables).

### GitHub automatic deployments

Confirm **Settings → Git** shows the intended repository and production branch, normally `main`. Vercel automatically builds production changes pushed/merged to that branch and creates previews from other branches. Its native Git connection is sufficient; a separate GitHub Actions deployment workflow or token is unnecessary for this setup. [Vercel Git deployments](https://vercel.com/docs/git).

## 10. Exact redirect URLs and origins

After Vercel assigns the real domain, use that exact production origin in all four places: **Vercel Domains**, **production `NEXT_PUBLIC_SITE_URL`**, **Supabase Site URL**, and **Google Authorized JavaScript origins**. Correct any temporary value and redeploy Vercel.

Open **Supabase → Authentication → URL Configuration**, set **Site URL** to `https://ACTUAL-VERCEL-DOMAIN`, then add these **Redirect URLs** and save:

```text
http://localhost:3000/**
https://ACTUAL-VERCEL-DOMAIN/auth/callback
```

The exact production callback is enough for the current Google flow. If more internal Supabase redirects are added, allow those exact paths or the scoped production pattern `https://ACTUAL-VERCEL-DOMAIN/**`.

If using Vercel previews, add the documented pattern with your own Vercel account/team slug:

```text
https://*-YOUR-VERCEL-ACCOUNT-OR-TEAM-SLUG.vercel.app/**
```

Do not allow every Vercel project or every website. Preview origins come from Vercel’s deployment environment; production’s stable origin remains `NEXT_PUBLIC_SITE_URL`. [Supabase redirect allow lists](https://supabase.com/docs/guides/auth/redirect-urls), [Vercel system deployment variables](https://vercel.com/docs/environment-variables/system-environment-variables).

| Dashboard setting | Value |
|---|---|
| Supabase Site URL | Actual Vercel production origin |
| Supabase production app callback | Actual production origin + `/auth/callback` |
| Supabase local app redirect | `http://localhost:3000/**` |
| Supabase preview redirects | Your account/team-specific pattern above |
| Google JavaScript origins | Actual Vercel origin and `http://localhost:3000` |
| Google Authorized redirect URI | **Exact callback copied from Supabase’s Google provider** |

Never put the Vercel `/auth/callback` URL in Google’s Supabase-provider redirect field. Never use localhost as the production site URL. The app accepts only approved internal `next` destinations; external URLs, protocol-relative redirects and malformed paths are rejected.

## 11. Testing results and checklist

**Local checks passed:** TypeScript, production build, lint (0 errors; 20 warnings in the existing assessment/UI code), and all 19 automated tests: 15 PostgreSQL/RLS/transaction checks, 2 assessment checks, and 2 redirect checks. The production server also passed signed-out route/API protection, cross-origin request rejection, and missing/cancelled/invalid OAuth callback checks. Browser review confirmed the signup fields, Google option/setup error, and login redirect. See `docs/qa-results.json`. Checks ran with the bundled Node.js 24.19.0; Vercel targets Node.js 22.x.

`docs/qa-legacy-sites.json` preserves the earlier Sites/D1 verification history. Neither that history nor these local tests proves the new hosted Supabase/Vercel Google flow works; real account tests remain pending.

Before deploying code, run the repository’s checks:

```sh
pnpm exec tsc --noEmit
pnpm lint
pnpm test
pnpm build
```

After applying the schema, seeding, completing Google configuration and deploying, complete all these tests locally and on the real production origin:

| Test | Expected outcome | Real Supabase/Vercel status |
|---|---|---|
| New email/password signup | Immediate session, one profile, dashboard | Pending manual setup |
| Duplicate email, weak password, mismatched confirmation | Safe readable error; no repeated submission | Pending |
| Logout | Signed out; protected pages/data unavailable | Pending |
| Email/password login | Dashboard; invalid credentials get generic error | Pending |
| Refresh while signed in, including `/dashboard` | Same signed-in account | Pending |
| Open protected page while signed out | Login redirect | Pending |
| Google as a new user | Google → Supabase → app callback → profile/dashboard | Pending |
| Google again after logout | Same Auth UUID/profile/progress | Pending |
| Cancel Google authorization | Friendly retry/login state | Pending |
| Production Google sign-in | Returns to actual Vercel domain, never localhost | Pending |
| Student A requests Student B’s rows/session IDs | RLS/server denies access or returns no rows | Pending |
| Open callback without valid code; replay a used code | Safe error redirect, no new session | Pending |
| Approved preview OAuth | Returns to that preview | Pending |
| Browser attempts to write grades or admin role | Permission denied | Pending |
| Practice, diagnostics, timed mocks, results, reviews | Correct per-user saved progress across refresh/login | Pending |
| Concurrent/expired attempt finalization | One authoritative result, no duplicate grading | Pending |
| Network failure / missing configuration | Readable retry/configuration message, no blank page | Pending |

The local database/schema tests can establish policy and transaction behavior in a test database. A configured hosted project is still needed to verify real Supabase email signup, cookie refresh and Google OAuth. Production verification needs the actual Vercel URL, not an example domain.

## 12. Security review

Verify the following before sharing the production link:

- **Credentials:** Supabase owns passwords. No custom password table, plaintext storage, password hashing, Google secret, service-role key, filled environment file or database credential enters GitHub or frontend bundles.
- **Sessions:** the application uses verified identity (`getUser` for server access; `getClaims` for proxy refresh/navigation). It does not authorize a request from an unverified `getSession` user object. Authentication responses are private/no-store and refresh responses preserve cookies/cache headers.
- **Ownership and roles:** server identity comes from Supabase. RLS is enabled, student IDs are constrained to `auth.uid()`, profile-role writes are protected, and user-editable metadata supplies display fields only.
- **Question bank:** the browser cannot fetch stored private answer-key JSON or directly mutate authoritative scores. Public catalog fields are deliberately limited. Administrators have explicit protected operations.
- **OAuth/redirects:** Google returns to the exact Supabase callback. App callback code exchange, cancellation and error paths handle failure safely. Internal destination validation prevents open redirects; production origin validation excludes localhost.
- **Database isolation:** server queries run inside transactions with local verified claims and `rayan_app`; commit/rollback releases that context. Keep RLS and role restrictions intact. Setup/import credentials remain owner-only.
- **Logs:** do not log passwords, Google secrets, OAuth codes, access/refresh tokens, cookies or database URIs. Inspect hosted logs without publishing credential-bearing content.

The migration’s Auth/profile and self-deletion helper functions use explicit authorization, qualified object names and restricted execution grants. They require review together with the actual hosted permissions. A code review/local test is not an independent security audit or production load test. Open the hosted project’s **Security Advisor** and **Performance Advisor** after applying the migration and resolve relevant findings without relaxing ownership policies. [Supabase Advisors](https://supabase.com/docs/guides/observability/advisors).

## 13. Anything still requiring manual action

**MANUAL ACTION REQUIRED:**

1. Create/choose the free Supabase project; copy the public URL/key and private transaction-pooler URI.
2. Apply `supabase/migrations/202610020001_platform.sql`; run `pnpm db:seed` with private local configuration.
3. Disable **Email → Confirm email** and keep new signups enabled.
4. Add Supabase’s exact callback to the existing Google Web client; enter its ID/secret into Supabase and enable Google.
5. Import the updated GitHub repository into Vercel, add the four required values and optional admin token, and deploy.
6. Copy the actual free production domain and reconcile it across Vercel, Supabase URL Configuration, Google origins and `NEXT_PUBLIC_SITE_URL`; redeploy after variable changes.
7. Complete the pending real-account and production tests. Check hosted policies/advisors and safe logs.
8. If existing students need their historical progress, privately export D1 records and complete a verified UUID-mapped import before directing them to the new site.

These account settings and deployment checks are not claimed complete until you perform them or connect the corresponding accounts for authorized access. The provided code and documentation prepare the project; they do not create an unseen Supabase/Vercel account configuration.
