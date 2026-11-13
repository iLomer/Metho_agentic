# Tester Rubric — Slice {{SLICE_ID}}

**Tester:** {{TESTER_NAME}} | **Date:** {{DATE}}

Score each dimension 1–3. All dimensions at 2 or higher pass; any 1 fails the slice. Write one sentence of critique for each score below 3: name the problem, point to `file:line`, and state the fix.

| Dimension | 3 | 2 | 1 | Score |
|---|---|---|---|---|
| Code Quality | Readable, well structured, no dead code or unexplained constants | Minor issues with no effect on behavior | Hard to follow, dead code, or structural problems | |
| Type Safety | Typecheck or build exits 0 with no suppressions | One justified suppression or safe assertion | Typecheck or build fails, or errors are silenced | |
| Test Coverage | Every acceptance criterion has a test that asserts it; the test command exits 0 | One criterion covered only indirectly | A criterion has no test, or the test command fails | |
| Convention Adherence | Commit format, naming and `ai/workflows/code-guidelines.md` all followed | One minor violation with no functional impact | Several violations, or debug output left in committed code | |
| Methodology Compliance | Every criterion met, tests written first, nothing out of scope | A small, justified out-of-scope addition | A criterion unmet, or significant out-of-scope work | |

## Critiques

<!-- One line per dimension scored below 3. Leave empty for a clean pass. -->

## Verification Commands Run

<!-- Run the commands from ai/workflows/definition-of-done.md in this session and record each exit code. Put each command in backticks: `meto-cli audit --rubric` re-runs them. -->

| Command | Exit Code | Notes |
|---------|-----------|-------|
| _(test command)_ | | |
| _(typecheck or build command)_ | | |
| _(lint command if present)_ | | |

## Outcome

PASS / CONDITIONAL PASS / FAIL
