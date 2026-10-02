# Rayan's Tutorial

[Website](https://shsat-atelier.resfet.chatgpt.site) · [GitHub repository](https://github.com/r4yan2wavy/Rayan-s-Tutorial)

An unofficial SHSAT preparation platform with saved student accounts, original reading practice, generated Math questions, and a protected content studio. The published Site includes its backend and persistent Cloudflare D1 database; students can create an account and begin without manually configuring a backend.

## What is included

- **Accounts and persistence:** email/password signup and login, salted password hashes, server-side sessions, account deletion, saved answers, results, annotations, and progress tied to each account.
- **Adaptive diagnostic:** 28–40 questions across 14 core skill areas, difficulty adjustments, fresh-content preference on retakes, and overall, ELA, Math, and skill estimates.
- **Practice:** mixed or subject-specific sessions, skill and difficulty selection, optional timing, answer feedback, explanations, supporting evidence, common traps, and reusable strategies.
- **Full mock:** 100 questions, 50 ELA and 50 Math, a persistent 180-minute deadline, passage-set navigation and locking, automatic submission on expiry, and saved-session restoration. Testing tools include highlighting, answer elimination, flags, notes, and a digital pencil.
- **Review:** a personal mistake bank, individual retries, mastery indicators based on repeated evidence, session history, and accuracy analytics.
- **Content studio:** administrator-only draft generation/import, validation, editing, approval/rejection, passage management, custom mock composition, and question-level performance signals.

The reading library contains **250 original passages and 1,000 passage questions**, with 50 passages at each of five difficulty levels. Math covers 17 skills with deterministic question templates, calculated answers, multiple-choice and numeric-entry grading, and on-demand variants. Standalone editing practice also uses rule-based templates. ELA expansion uses authored JSON imports; the app does not call a language model during student sessions.

## Administrator access

The site owner has received a private administrator-access file separately. Create a normal account, open **Account → Content studio access**, and activate it with the provided setup code. Keep that file private; students do not need it. The README intentionally contains no setup code or credentials.

## Local development

Use Node.js **22.13.0 or newer** and pnpm, then run these commands from this directory. A fresh local database needs the supplied migration once:

```sh
pnpm install --frozen-lockfile
pnpm build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_legal_gladiator.sql
pnpm dev
```

For local administrator access, run `node scripts/admin-setup.mjs` once before starting the server. This creates ignored local secrets and a private instruction file; it does not configure or rotate the hosted secret.

The development server uses `http://127.0.0.1:5173`. Local database state lives in `.wrangler/state`; it is separate from the published database. Do not replay an already-applied migration. `pnpm start` previews the built Worker locally, and `pnpm db:generate` generates migrations after schema changes.

With the local development server running, reproduce the backend checks in a disposable local database:

```sh
node scripts/test-platform.mjs
node scripts/test-expiration.mjs
```

These scripts create test accounts and sessions. The expiration test changes the deadline of its own local test session. Additional developer checks are `npx tsc --noEmit`, `pnpm lint`, and `pnpm build`.

## Verification and limits

The saved [QA report](docs/qa-results.json) records passing local and hosted checks, including: authentication and logout, **12,750 Math generation/grading cases**, answer-write concurrency, practice scoring and mistake capture, retries, diagnostic coverage/stopping and fresh retakes, mock composition/timing/locking/restoration, canonical concurrent submission, account isolation, protected administration, and server-side expiry. Hosted signup, database initialization, saved practice, submission, and administrator activation were also verified. A production load test and independent security audit have not been performed.

The [content report](docs/content-validation.json) records unique IDs, distinct choices, exact supporting excerpts, structural checks, and exact/near-duplicate checks. The readings are **142–186 words**, shorter than many official reading passages. Difficulty labels are editorial and have not been calibrated with student responses or independently reviewed by a SHSAT educator. Template-generated variants also have finite conceptual variety.

Adaptive selection, ability estimates, confidence percentages, and mastery labels are deterministic practice approximations. They are not calibrated psychometric measures, official SHSAT scores, admission predictions, or NYCPS algorithms. The app contains original practice content rather than official NYCPS questions.
