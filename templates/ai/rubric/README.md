# ai/rubric/

| File | Purpose |
|------|---------|
| `tester-rubric.md` | Blank rubric: @meto-tester copies it for each M/L slice |
| `tester-calibration-log.md` | Past misjudgments and the corrected thresholds |
| `slice-NNN-score.md` | Completed rubric for slice NNN (XS/S slices are self-validated and have none) |

| Scores | Outcome | Next |
|--------|---------|------|
| All 3 | Pass | Task moves to `tasks-done.md` |
| All 2 or higher | Conditional pass | Task moves to `tasks-done.md`; the tester suggests a follow-up slice for a 2 worth tracking |
| Any 1 | Fail | Task returns to `tasks-todo.md` with the failed criteria listed |

Score files are the project's quality history: keep them, and record a wrong past score in the calibration log instead of editing the file. A retest writes a new score file covering only the failed criteria plus a fresh command run.

`meto-cli audit --rubric` checks that recent done slices have a score file and re-runs the commands listed in it.
