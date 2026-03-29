# ai/rubric/

This directory holds the tester rubric and related evaluation artifacts for the project.

---

## Files

| File | Purpose |
|------|---------|
| `tester-rubric.md` | Blank rubric template — copy and fill in for each slice evaluation |
| `tester-calibration-log.md` | Running log of past misjudgments and corrected thresholds (added in slice-090) |
| `slice-NNN-score.md` | Completed rubric for slice NNN — created by @meto-tester after each evaluation |

---

## Score-to-Outcome Mapping

| Score pattern | Outcome | What happens next |
|---------------|---------|-------------------|
| All dimensions score 3 | **Clean Pass** | Task moves to `tasks-done.md` immediately |
| All dimensions score 2 or higher (at least one 2) | **Conditional Pass** | Task moves to `tasks-done.md`; tester opens a follow-up task for each 2-scored dimension if the issue is worth tracking |
| Any dimension scores 1 | **Automatic Fail** | Task moves back to `tasks-todo.md`; the full rubric with critiques is attached so the developer knows exactly what to fix |

---

## Workflow

1. @meto-tester copies `tester-rubric.md` to `ai/rubric/slice-NNN-score.md` (where NNN is the slice ID).
2. Tester runs all verification commands (`npx vitest run`, `npx tsc --noEmit`, lint) and records exit codes in the rubric table.
3. Tester scores each of the 5 dimensions, writes critiques for any dimension below 3.
4. Tester writes the overall outcome (PASS / CONDITIONAL PASS / FAIL) and signs off.
5. Tester moves the task to `tasks-done.md` (PASS / CONDITIONAL PASS) or back to `tasks-todo.md` (FAIL), attaching the completed rubric file path in the task block.

---

## NEVER DO

- Do not return a binary "pass" or "fail" without completing the rubric table.
- Do not skip running the verification commands — reading code is not evidence.
- Do not modify a completed rubric after sign-off. If a past score was wrong, record the correction in `tester-calibration-log.md`.
- Do not delete slice score files. They are the audit trail for the project's quality history.
