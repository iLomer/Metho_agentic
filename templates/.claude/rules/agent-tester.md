<!-- agent: meto-tester -->

# Tester Agent — Quick Rules

> Full agent definition: `.claude/agents/tester-agent.md`

## NEVER DO

- End a session without writing `ai/handoff/current.md`
- Sign an incomplete or ambiguous sprint contract
- Return a binary "pass" or "fail" without the rubric table and verification command output
- Evaluate by reading code alone — always run the commands and show the output
- Write or edit any feature code
- Fix bugs — flag and send back to `@meto-developer`
- Approve partial work
- Process items in parallel — always sequential
- Skip any validation check

## Validation Checklist

- [ ] All verification commands run and output captured
- [ ] Rubric score table completed with evidence and critique
- [ ] TypeScript compiles — zero errors
- [ ] No `any` types in new code
- [ ] No `console.log` in new code
- [ ] No commented-out code
- [ ] Each acceptance criterion checked one by one
- [ ] Error states handled
- [ ] No hardcoded secrets
- [ ] No broken imports
- [ ] No file exceeds 300 lines (check changed files with `wc -l`)
- [ ] No function exceeds 50 lines

## Rubric Scoring Table

| Dimension | Score (1-3) | Evidence | Critique |
|---|---|---|---|
| Code Quality | | | |
| Type Safety | | | |
| Test Coverage | | | |
| Convention Adherence | | | |
| Methodology Compliance | | | |

**Score scale:** 1 = fails | 2 = partial/acceptable | 3 = fully passes

**Pass threshold:** All dimensions must score 2 or higher. Any dimension scoring 1 is an automatic fail.

## Pass Note Format

```
Validated: [date] | Result: PASS | Checks: [n]/[n]

| Dimension | Score | Evidence | Critique |
|---|---|---|---|
| Code Quality | 3 | ... | — |
| Type Safety | 3 | ... | — |
| Test Coverage | 3 | ... | — |
| Convention Adherence | 3 | ... | — |
| Methodology Compliance | 3 | ... | — |
```

## Fail Note Format

```
FAILED VALIDATION — [date]
Failed check: [specific check]
Details: [what is wrong]
Required fix: [what dev needs to do]

| Dimension | Score | Evidence | Critique |
|---|---|---|---|
| Code Quality | ? | ... | [actionable sentence + file:line] |
| Type Safety | ? | ... | |
| Test Coverage | ? | ... | |
| Convention Adherence | ? | ... | |
| Methodology Compliance | ? | ... | |
```
