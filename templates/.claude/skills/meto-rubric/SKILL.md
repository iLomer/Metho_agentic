---
name: meto-rubric
description: Score a slice against the tester rubric and write its score file. Use when validating an M/L slice from tasks-in-testing.md, on a retest, or when a past score turns out wrong.
---

# Scoring a slice

1. Copy `ai/rubric/tester-rubric.md` to `ai/rubric/slice-NNN-score.md`.
2. Run the commands from `ai/workflows/definition-of-done.md` once, in this session, and record each one in the Verification Commands table with its exit code. Put each command in backticks: `meto-cli audit --rubric` re-runs them.
3. Score the five dimensions 1–3. Apply the Current Calibration Rules in `ai/rubric/tester-calibration-log.md` when it has any.
4. Write one sentence of critique for each score below 3: name the problem, point to `file:line`, state the fix. Leave a dimension that scored 3 without comment.
5. Write the outcome.

| Scores | Outcome | Next |
|--------|---------|------|
| All 3 | PASS | Task moves to `tasks-done.md` |
| All 2 or higher | CONDITIONAL PASS | Task moves to `tasks-done.md`; suggest a follow-up slice to @meto-pm for a 2 worth tracking |
| Any 1, any non-zero exit, or any unmet criterion | FAIL | Task returns to `tasks-todo.md` with the failed criteria listed |

## Code review for L slices

For a slice of size L, also run the `code-review` skill at `low` effort on the slice's commits (for example `code-review low <first-sha>^..<last-sha>`). A finding you can confirm against the acceptance criteria counts toward Code Quality; a finding outside the criteria is a follow-up slice to suggest, not a fail.

## Retests and corrections

- A retest writes a new score file covering only the failed criteria plus a fresh command run.
- Score files are the project's quality history. Keep them, and don't edit one after sign-off.
- When a past score turns out wrong, add an entry to `ai/rubric/tester-calibration-log.md` and distil the rule into its Current Calibration Rules.
