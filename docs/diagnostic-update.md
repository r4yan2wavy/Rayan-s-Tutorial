# 100-question adaptive diagnostic

The diagnostic now finishes only after all 100 answers are saved: **50 ELA and 50 Math**. New sessions present 40 reading questions in ten complete passage groups, then 10 revising/editing questions, then 50 Math questions. Save and exit remains available throughout.

Reading difficulty changes between complete passage groups. Each of levels 1–5 has 50 original passages with four questions per passage. Selection prefers passages the student has not seen, excludes every passage already queued in the diagnostic, and reuses the oldest passage only after that level's unseen bank is exhausted. The original 250 passages and 1,000 reading questions were retained.

The additive editing update provides 200 validated questions, 40 at each level, covering grammar, sentence structure, organization, and revision. Editing difficulty follows ELA evidence. Math generates and validates variants at the current level and balances its skills while adjusting after each answer. If generation repeatedly collides with the shared library, it may select an approved question at the exact skill and level that this student has never seen; it does not repeat a session item or substitute a different level.

Active older diagnostics expand to 100 questions while retaining saved answers, question IDs, tools, and position. Historical completed results retain their original length. Diagnostic sessions are untimed. The server rejects early submission and checks the final subject counts and unique question IDs.

## Verification

- Automated assessment, content, database/RLS, authentication, and service checks passed.
- An isolated PostgreSQL-compatible service test completed the actual 100-question workflow, checked adaptation, refreshed saved sessions, and rejected early submission.
- The active session response does not expose private answer keys.
- The production build and TypeScript checks passed. Lint reported no errors; existing warnings remain.
- Live database content was verified after the additive seed: 50 complete passages and 40 versioned editing questions at each of five levels.

The automated full completion uses an isolated test database. Live browser checks cover the deployed interface and session persistence; they do not fabricate 100 answers in a student's production account.

## Existing content limitations

Difficulty labels are editorial rather than calibrated on student responses. The reading passages have not received an independent human SHSAT educator review and are shorter than many official exam passages. This is a practice diagnostic, not an official SHSAT score prediction.

## Applying the update elsewhere

For an existing seeded database, run `pnpm db:seed-editing` before deploying the new selectors. This inserts the versioned questions without replacing existing questions or answers. A new database uses the normal migration and `pnpm db:seed` workflow described in the deployment guide.
