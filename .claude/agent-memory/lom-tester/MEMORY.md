# Tester Agent Memory — Lom

*Read at session start. Update at session end. Keep it concise.*

---

## Recurring Failures
*(Populate as patterns emerge)*

## Codebase Quirks
- Templates folder contains `{{TOKEN}}` placeholders — these are correct, not missing values
- Hidden folders in `/templates/.claude/` must be checked manually — some glob patterns skip dot folders

## Test Log Summary
- Total passed: 0
- Total failed: 0

## Watch Out For
- CLI must be tested from a fresh temp directory, not the project root
- `npx tsc --noEmit` catches type errors but not runtime issues — also run `npm run build`
