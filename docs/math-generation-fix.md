# Math generation and review feedback

The reported bead problem has a correct answer of 135: 36 red beads at a 4:11 ratio means 9 groups, 99 blue beads, and 135 beads altogether. Its old feedback incorrectly referred to a sequence, and its distractors were arbitrary offsets.

Math generation now uses versioned `procedural-v2` questions with distinct choices based on common mistakes and problem-specific explanations across all 17 skills. Prompts specify fraction/decimal precision where needed; pump problems correctly describe more, fewer, or the same number of pumps.

New Math selections use the corrected generator. Recognized saved questions and completed results receive improved feedback when read, preserving the original prompt, choices, choice order, answer key, submitted answers, and scores. This requires no rewrite of student records. Existing qualified Probability grid questions remain eligible when the finite fresh content pool is exhausted.

Validation:

- Full automated suite: 52 tests passed, including actual database-backed diagnostic, saved-result, and mistake-bank flows.
- Independent prompt-derived oracle: 2,040 generated answers checked across all 17 skills, five difficulty levels, and both template variants.
- Generator sweep: 170,000 parameter combinations checked for structural validity and distinct finite choices.
- TypeScript and the production build passed. Changed-file lint has no errors; the existing unused catch-variable warning in the admin handler remains.

Regression coverage preserves the reported old choices (`270`, `135`, `139`, `124`) while replacing their generic feedback. Fresh questions carry `-v2` IDs so historical grading remains stable.
