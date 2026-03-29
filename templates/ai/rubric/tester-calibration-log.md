# Tester Calibration Log — {{PROJECT_NAME}}

<!-- LOCATION: This file lives at ai/rubric/tester-calibration-log.md in the scaffolded project. -->
<!-- @meto-tester MUST read this file at session start before evaluating any slice. -->
<!-- Update "Current Calibration Rules" every time a new entry is added below. -->

---

## Current Calibration Rules

<!-- INSTRUCTIONS: Keep this section current. Each time you add a new log entry, -->
<!-- distil the rule from that entry into the list below. This section is the active -->
<!-- working rule set @meto-tester applies on every evaluation. -->
<!-- Delete example rules and replace with real ones when the first real entry is added. -->

1. **Test Coverage — partial implementation still scores 2, not 1** — If the implementation covers all acceptance criteria but lacks edge-case tests that were never specified in the contract, score 2 (partial) rather than 1 (fail). Score 1 only when an AC is provably untested.
2. **Convention Adherence — a single stray debug log is score 2, not 1** — A committed `console.log` left in a non-critical path is a partial violation (score 2). Score 1 only when debug output meaningfully pollutes production behaviour or multiple violations exist.

---

## Log Entries

<!-- INSTRUCTIONS: Add new entries at the TOP (reverse-chronological). -->
<!-- Copy the entry template below for each new entry. -->
<!-- Fictional slice IDs (slice-000, slice-001) used for illustration — delete these examples -->
<!-- once the first real entry is recorded. -->

---

### Entry 2 — Example

| Field | Value |
|---|---|
| **Date** | 2026-01-15 |
| **Slice ID** | slice-001 |
| **Dimension Affected** | Convention Adherence |
| **What was scored incorrectly** | Scored 1 (fail) because one `console.log` was found in a utility helper; correct threshold is score 2 (partial) for a single isolated debug statement that does not affect production output |
| **Correct score in retrospect** | 2 — partial violation, not a full fail |
| **Rule update** | A single isolated `console.log` in a non-critical path is a partial violation (score 2); only score 1 when multiple violations exist or when debug output pollutes production behaviour |

---

### Entry 1 — Example

| Field | Value |
|---|---|
| **Date** | 2026-01-08 |
| **Slice ID** | slice-000 |
| **Dimension Affected** | Test Coverage |
| **What was scored incorrectly** | Scored 1 (fail) because an edge case not listed in the sprint contract had no test; the implementation itself covered all agreed acceptance criteria |
| **Correct score in retrospect** | 2 — all contracted criteria were covered; the missing edge case was out of scope for the contract |
| **Rule update** | Score Test Coverage based on contracted acceptance criteria only; uncontracted edge cases lower the score to 2 (partial) but never to 1 (fail) unless an AC is provably untested |

---

## Entry Template

<!-- Copy this block for each new entry. Replace all placeholder values. -->

<!--
### Entry N — [brief label]

| Field | Value |
|---|---|
| **Date** | YYYY-MM-DD |
| **Slice ID** | slice-NNN |
| **Dimension Affected** | [Code Quality / Type Safety / Test Coverage / Convention Adherence / Methodology Compliance] |
| **What was scored incorrectly** | [Describe what score you gave and why it was wrong] |
| **Correct score in retrospect** | [1 / 2 / 3 — and why] |
| **Rule update** | [One sentence: the threshold adjustment to apply in all future evaluations of this dimension] |
-->
