# Queens Scholars Tutorial

A local full-stack SHSAT tutoring portal with public enrollment pages, custom
administrator/teacher/student accounts, classroom management, assignments,
and shared learning tools. The center contact is **718-913-7706** for calls/texts.
No checkout, payment service, runtime AI model, AI key, or Google login is required.

This source project implements the core portal and review/expansion framework.
**It does not yet satisfy the master specification’s full question-bank,
standards-audit, digital-format, editorial-review, or score-calibration targets.**
Read `docs/LIMITATIONS.md` before using it as a complete exam simulator.

## Run on your PC

Use Node.js 22.13 or newer. Open the extracted project folder in VS Code or Roo
Code and run these commands in its terminal:

```bash
npx pnpm@11.25.0 install --frozen-lockfile
npm run local:init
npm run build
npm run db:local
npm run dev
```

Open **http://localhost:5173**. The local initialization command prints a private
setup link. Open that link, choose your own administrator username and password,
and log in. There is no shared default administrator password. The setup link
closes after the first administrator is created. Run `npm run local:init` again
to display your existing private setup link if the first account has not been made.

Initial dependency installation needs internet access. Studying and account
management need the local server running; no AI API or paid external service is
needed. Local files persist across restarts and are shared by users of that
server. A local server on your PC is not an internet-hosted tutoring service.

For a built local preview instead of development mode, use:

```bash
npm start -- --port 5173
```

## First center setup

1. Create a class in **Classes** and set its grade track and optional public
   description/schedule. A public class listing does not expose its roster.
2. Create teacher accounts in **Teachers** with custom usernames and initial
   passwords, assigning their classes. Only administrators create staff.
3. Create students or convert saved **Enrollment requests** into student
   accounts. Teachers may create students only in their authorized classes.
4. Provide each initial password privately. First login requires a replacement
   password; staff cannot retrieve an existing password. Password resets close
   previous sessions and restore the first-login change requirement.
5. Create **Homework** or **Classwork** with your own title, instructions,
   recipients, due date, attempt limit, time limit, and feedback policy. Save
   drafts, schedule publication, preview, and duplicate work as needed.
6. Inspect submissions in **Results**. Leave feedback, approve an individual
   retry, extend that student’s deadline, or audit a corrected correct-count.
7. Use **Revoke access** to block a teacher or assigned student immediately
   throughout the portal. History remains. Restoration always requires a fresh
   login. Teachers can restore only their own revocations within current scope
   and cannot override an administrator’s revocation or enrollment pause.
8. Staff open **My Learning** for their own practice, personal homework/classwork,
   diagnostics, results, mistake notebook, and configurable daily study plan. Their role and management access
   stay the same; personal attempts are excluded from student/class totals.

## Publish learning content

Math practice is available through 27 reproducible blueprints. Diagnostic Math
scope still requires staff review. The 50 ELA questions and 8 original passages
start as drafts. In **Content review**, inspect the exact answer, evidence,
explanation, distractors, grade scope, and rights, then record real review notes
before publishing. The test suite’s fixture publication never publishes content
in the actual application database.

**Full diagnostics remain unavailable until enough reviewed content exists.**
The small initial ELA bank has enough material for one unexposed full attempt
once reviewed, and correctly reports a reserve shortage for later full attempts.
The expansion target is much larger. Staff can author/import batches of 1–100
complete drafts; see `lib/content/author.ts` and the author/import screen.

The full rehearsal uses 50 ELA and 50 Math items, a shared 180-minute deadline,
a starting-subject choice, locked committed items/sets, and an independent
adaptive practice approximation. It is not the official exam or its confidential
scoring engine. Currently supported answer formats are single-choice and exact
numeric entry. The assessment includes answer elimination, notepad, paragraph
focus, temporary scratch drawing with keyboard input and undo/redo/clear, and
reviewed glossary data where authored. Official digital-format resources are
linked in the portal. Daily study plans save 15–60 minute sessions, subject focus,
and chosen weekdays for every learning role. Preference export/import changes
only the signed-in account’s study preferences.

## Score reports

Every finished attempt records counts, section performance, practice ability,
uncertainty, eligibility, and model/content versions. A numeric SHSAT estimate
appears only when an administrator has approved a defensible mapping for an
eligible full attempt. There is no installed numerical conversion by default:
**SHSAT score estimate not yet calibrated** is the correct initial status.

Import/version mechanics, uncertainty limits, required validation evidence, and
historical preservation are described in `docs/SCORING.md`. Synthetic scoring
fixtures are restricted to the isolated QA database and cannot demonstrate
real-world score accuracy. Teachers cannot set predicted scores or change curves.

## Verify

```bash
npm run check:types
npm run test:content
npm run test:portal
npm run build
```

The portal suite runs real application API logic against an isolated Miniflare
SQLite/D1 database. It provisions fixture accounts, exercises allowed/forbidden
requests, submits work, completes staff/student diagnostics, checks versioned
score reporting, and revokes/restores sessions. It does not alter the actual
center database or create production/demo accounts. Mathematical checks test
27,000 seeded instances and exact numeric equivalence. ELA structural checks do
not substitute for editorial review. Desktop enrollment/contact and isolated
assessment-tool browser checks passed. Full protected-flow, mobile, and
accessibility QA remains open; see `tests/browser-verification-report.json`.

## Backup and restore

```bash
npm run db:backup
```

Backups are SQL exports under `backups/`; they include private account hashes,
contacts, and academic history. Keep them private and maintain a separate copy
away from the computer. A source-code ZIP does not back up the live database.

To rehearse restoration, import a backup into a fresh local persistence folder:

```bash
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/restored-state --file backups/YOUR_BACKUP.sql
```

Stop the local server before switching state folders. Preserve `.wrangler/state`
as a previous-state copy, then move `.wrangler/restored-state` to `.wrangler/state`.
Start the server and verify account, class, submission, and audit records.
The backup helper places all table definitions ahead of data and preserves
quoted values, so foreign-key parents exist during import. Recovery with
disposable enrollment, class, membership, and attempt data is recorded in
`tests/local-setup-verification-report.json`. No destructive automatic restore
command is included.

For an older database without the local migration ledger, first back it up.
Determine exactly which migration files are already applied; the helper refuses
to replay initial migrations against unknown existing data. Apply only the
pending migrations using Wrangler’s local `d1 execute --file` command, then
record those filenames in `qst_local_migrations`. Preserve previously applied
migrations and metadata. Never overwrite an unknown database to get setup working.

## Project structure

- `app/`: public pages, role dashboards, shared assessment UI, staff personal
  learning, account actions, score reports, and authoring/review interfaces.
- `lib/api.ts`: server authentication/authorization, enrollment, classes,
  assignment workflows, grading/deadlines, revocation, and academic exports.
- `lib/auth.ts`: salted scrypt password hashing and HTTP-only cookie sessions.
- `lib/content/`: curriculum registry, seeded Math models, ELA drafts, import
  validation, and original passage attribution.
- `lib/adaptive.ts`, `lib/exam.ts`, `lib/scoring.ts`: versioned independent
  practice model, exam configuration, and approved mapping/eligibility mechanics.
- `db/schema.ts`, `drizzle/`: shared SQLite/D1 schema and incremental migrations.
- `tests/`: executable checks and their actual generated reports.
- `docs/`: master specification, limitations, score method, sources, dependencies.

The runtime uses React/Vinext with a Cloudflare Worker-compatible build and
SQLite-compatible D1 bindings. Browser storage is not the account or grade store.
Vercel deployment has now been requested. See `docs/VERCEL_DEPLOYMENT.md` for
the current deployment requirements and account-access blocker. Do not deploy a
writable database on ephemeral storage. Public signup saves inquiries rather than granting access;
phone buttons open the visitor’s calling/messaging application without sending
anything automatically. Future hosting must support this real shared backend.
