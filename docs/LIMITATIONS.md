# Remaining work before calling the complete specification fulfilled

This is a functioning local portal and content-authoring foundation. It does
not fulfill the entire master prompt's content and simulation targets yet.

| Area | Present implementation | Remaining requirement |
|---|---|---|
| Accounts | Server-side custom username/password sessions, initial changes, resets, suspension, revocation/restoration, role/class scope | Additional production operations and load review |
| Staff personal learning | Practice, personal titled homework/classwork, mini/full diagnostics, results, mistakes, follow-ups, grade choice | Broader bank and independent calibrated estimates |
| Homework/classwork | Custom titles, selected or whole-class recipients, drafts, scheduling, preview, retries, per-student deadline extensions, feedback release | Handout/file uploads and complete lesson-resource workflows |
| Curriculum | 359 expanded preparation-checklist entries and 39 active practice topic families | Individual standards audit, specific prerequisites and verified coverage for every assessable leaf |
| Math | 27 reproducible blueprints; 1,000 seed tests per blueprint, 27,000 checks total | Several strong blueprints and at least 1,000 validated distinct instances per assessable core leaf; calibrated item difficulty |
| ELA | 8 original passages, 40 passage questions, 10 stand-alone editing questions; draft review/import workflow | Independent editorial review, 250 suitable passages and 2,000 reviewed items as the first substantial release; eventual per-leaf expansion |
| Full diagnostics | 50+50 items, shared 180-minute server deadline, starting subject choice, passage-set locks, committed-response adaptation, saved recovery | All official digital formats, accommodation behavior, larger reserve bank, external comparison of difficulty and interfaces |
| Digital formats | Single-choice and exact numeric entry; highlighting, keyboard paragraph focus, answer elimination, notepad, temporary drawing with undo/redo/clear, and authored glossary popups | Multiple response, equation editor, dropdown, drag/drop, matching, table entry, coordinate/region interaction, grade-9 solution sets; broader glossary coverage and verified parity with the official interfaces |
| Score reporting | Saved counts, section ability/uncertainty, eligibility, versioned mapping import, history, scaled-estimate mechanics | Defensible empirical calibration and held-out prediction evidence; no numerical SHSAT mapping is installed |
| Follow-ups | Two related Math instances; ELA selects different reviewed contexts or reports insufficient content | Larger bank so every ELA mistake has two strong distinct follow-ups; richer transfer blueprints |
| Study packs | Protected shared database and own/role-scoped academic exports | Approved offline content packs, pack updates and learning-data import; safe study-preference import and configurable daily plans are implemented |
| Verification | TypeScript, production build, mathematical checks, isolated end-to-end API tests | Full protected-flow browser/mobile/accessibility QA, interruption/load tests, deployed service and production recovery rehearsal |
| Hosting | Local runnable project; D1-compatible schema and Worker build | Hosting selection, deployment, persistent production database and operations; no new deployment was performed |

ELA drafts are not automatically published. The first administrator must review
them in Content review and record the evidence for publication. Full diagnostic
start is gated on adequate published ELA content and reviewed Math scope. The
small release can support at most one unexposed full ELA rehearsal per learner;
subsequent full rehearsals correctly report a reserve shortage.

Math practice is available for learning while individual diagnostic scope awaits
staff review. Seed tests establish arithmetic invariants, not authentic SHSAT
difficulty or a complete standards audit. A thousand random seeds may produce
fewer than a thousand unique mathematical instances; the coverage report gives
both numbers and does not call variants authored question types.

Public inquiries are saved in the local server database. They do not send emails
or texts, activate learning accounts, or charge tuition. No payment SDK, runtime
language model, AI key, public create-admin route without a private setup token,
or shared production demo credential is included.

Scratch drawings and answer elimination are temporary interface tools, not graded
responses or persistent notes. Glossary entries must be reviewed with their
passage; the initial glossary covers only the revised clock passage. Daily study
plans save session length, subject focus, and selected weekdays on the server.
Preference import cannot change grades, roles, accounts, or assignment records.
