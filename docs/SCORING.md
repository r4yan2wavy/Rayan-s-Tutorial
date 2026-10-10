# Score estimation and calibration

The application deliberately contains no default SHSAT raw-to-scaled curve. It
never multiplies accuracy by 800 or applies a historical 114-question curve.

`lib/exam.ts` fixes administration year, admission year, simulator version,
content release, item count, standard time, and ability-model version. The
independent practice model in `lib/adaptive.ts` fits a subject ability from
reviewed difficulty bands, with a regularizing prior and reduced weight for
shared-passage items. Its uncertainty is heuristic, not an official score error.

After an attempt finishes, the server saves actual counts, section performance,
practice ability and uncertainty, eligibility, conditions, model and content
versions, and any eligible scaled estimate in `attempts.score_json`. Reading a
result uses the saved snapshot. Importing a new mapping preserves previous
reports. There is no implicit historical recalculation endpoint.

Only an authorized administrator can approve a calibration. The import must
match year, grade, ability model, and content release and must document source,
permissions, sample relevance, held-out validation, measured section errors,
and measured residual intervals. JSON structural validation does not prove
that a research claim is true. Staff must evaluate the supplied evidence.

The import payload has these fields (no invented numerical curve is supplied):

- `version`, `title`, `examYear`, `admissionYear`, `grade`, `abilityModel`,
  `contentRelease`, and `precision` (1, 5, or 10).
- `source`: `description`, HTTPS `url`, `permissions`, `sampleSize`,
  `heldOutSize`, `validationSummary`, `representativeness`, and
  `sectionErrors` with measured `ELA` and `Math` prediction errors.
- `sections.ELA` and `sections.Math`: each contains 3–100 ordered `points`
  (`ability`, `scaled`) and a measured two-value `residual95` interval.

Mapping points are interpolated without extrapolation. Results outside covered
ability ranges remain unavailable. Subject residual bounds are combined into a
total range; the UI explicitly does not claim 95% coverage for that total.
Independent validation of a total-score prediction interval remains necessary
for any stronger claim.

A full eligible result requires 100 reached responses, 50 per subject, a standard
timed diagnostic, and no known prior exposure or repeated content. Partial,
abandoned, interrupted, homework, classwork, and shorter attempts show counts
and a reason scaled estimation is unavailable. Teacher and administrator
personal diagnostics use exactly the same checks. Staff previews and content
review record prior exposure. Previously served content is conservatively
excluded from independent-estimate eligibility.

The automated verification suite imports a **synthetic isolated test fixture**
to check mechanics and immutability. That fixture is created only in a temporary
QA database; it is not a production calibration, cannot establish score accuracy,
and is never installed in a user's project by local setup.
