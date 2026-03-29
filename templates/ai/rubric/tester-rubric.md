# Tester Rubric — Slice {{SLICE_ID}}

<!-- Fill in all fields before submitting the rubric. Incomplete rubrics are not valid evaluations. -->

**Tester:** {{TESTER_NAME}}
**Date:** {{DATE}}
**Slice:** {{SLICE_ID}}

---

## Grading Dimensions

Score each dimension on a 1–3 scale using the criteria below. Every score below 3 requires a written critique (see Critique Format section).

---

### 1. Code Quality

| Score | Criteria |
|-------|----------|
| 3 | Code is readable, well-structured, no dead code, no magic numbers, all identifiers are descriptive |
| 2 | Mostly readable with minor issues: one or two unclear names, a stray commented block, or a magic number with obvious intent |
| 1 | Code is difficult to follow, contains dead code, relies on unexplained magic numbers, or has significant structural problems |

**Score:** ___

**Critique (required if score < 3):**

<!-- One sentence of actionable feedback. Point to a specific file and line number where possible. Example: "src/cli/audit/scanner.ts:42 uses the magic number 20 — extract it as a named constant MAX_BAR_WIDTH." -->

---

### 2. Type Safety

| Score | Criteria |
|-------|----------|
| 3 | No `any` types anywhere, `tsc --noEmit` exits 0 with zero errors or warnings |
| 2 | One suppressed `any` with a clear justification comment, or `tsc` exits 0 but with a minor type assertion that is technically safe |
| 1 | `any` type used without justification, `tsc --noEmit` exits non-zero, or type errors are suppressed silently |

**Score:** ___

**Critique (required if score < 3):**

<!-- One sentence. Example: "src/cli/init/renderer.ts:88 uses `as any` to bypass a union type — the correct fix is to narrow the type with a type guard." -->

---

### 3. Test Coverage

| Score | Criteria |
|-------|----------|
| 3 | Failing test written before implementation (red→green confirmed), all acceptance criteria have at least one corresponding test, `npx vitest run` exits 0 |
| 2 | Tests cover most acceptance criteria but one AC has no direct test, or the red→green order cannot be verified but tests are otherwise complete |
| 1 | Tests added after the fact without red→green discipline, one or more acceptance criteria have no test, or `npx vitest run` exits non-zero |

**Score:** ___

**Critique (required if score < 3):**

<!-- One sentence. Example: "The 'minimum pass threshold' AC has no test — add a test asserting that a dimension scored 1 causes the rubric evaluation to return FAIL regardless of other scores." -->

---

### 4. Convention Adherence

| Score | Criteria |
|-------|----------|
| 3 | Commit message matches the format `type(scope): description [agent-tag]`, file naming follows project conventions, no `console.log`, no hardcoded scaffold content in `/src/` |
| 2 | One minor convention violation (e.g. missing agent tag in commit, a slightly inconsistent file name) with no functional impact |
| 1 | Commit message does not follow the format, `console.log` present in committed code, scaffold content hardcoded in source, or multiple convention violations |

**Score:** ___

**Critique (required if score < 3):**

<!-- One sentence. Example: "Commit a3f9c1b is missing the [dev-agent] tag — amend or note in the next commit message." -->

---

### 5. Methodology Compliance

| Score | Criteria |
|-------|----------|
| 3 | Sprint contract exists at `ai/contracts/slice-{{SLICE_ID}}-contract.md` and is signed by both agents, task definition was followed exactly, no out-of-scope work delivered |
| 2 | Sprint contract exists and is signed but has one minor gap (e.g. an edge case that was agreed verbally but not written into the contract), or a very small out-of-scope addition with clear justification |
| 1 | No sprint contract, contract not signed before code was written, significant out-of-scope work delivered, or task definition was materially deviated from |

**Score:** ___

**Critique (required if score < 3):**

<!-- One sentence. Example: "ai/contracts/slice-088-contract.md was not signed before implementation began — retroactive sign-off does not satisfy the contract-first rule." -->

---

## Minimum Pass Threshold

<!-- Do not modify this section. It is part of the rubric definition. -->

- All dimensions must score **2 or higher** to pass.
- Any dimension scoring **1 is an automatic fail** — the slice returns to todo regardless of other scores.
- A score of 2 across all dimensions is a **conditional pass** — the tester must note in the rubric table what must be improved in the next slice or a follow-up task.
- A score of 3 across all dimensions is a **clean pass**.

**Overall result:** PASS / CONDITIONAL PASS / FAIL _(circle one)_

---

## Critique Format

For each dimension that scored below 3, write exactly one sentence of actionable feedback. The sentence must:

1. Name the specific problem (not "code quality issues" — name the actual issue)
2. Point to a file and line number where possible
3. State the corrective action the developer should take

**Do not write critiques for dimensions that scored 3.** Silence on a dimension means it passed cleanly.

---

## Verification Commands Run

<!-- List every command you ran and its exit code. Never evaluate by reading code alone. -->

| Command | Exit Code | Notes |
|---------|-----------|-------|
| `npx vitest run` | | |
| `npx tsc --noEmit` | | |
| _(lint command if present)_ | | |

---

## Final Sign-off

By submitting this rubric, I confirm that I ran all verification commands in the current session and that every score reflects observed evidence, not assumption.

**Tester:** {{TESTER_NAME}}
**Date:** {{DATE}}
**Outcome:** PASS / CONDITIONAL PASS / FAIL _(circle one)_
