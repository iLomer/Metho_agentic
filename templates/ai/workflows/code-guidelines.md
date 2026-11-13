# Code Guidelines — {{PROJECT_NAME}}

`@meto-developer` follows these while implementing. `@meto-tester` verifies them through the project's lint, typecheck and test commands rather than by hand, so a rule worth keeping is worth a lint rule.

## Size limits

| Scope | Max lines | Action |
|---|---|---|
| File | 300 | Split into focused modules |
| Function or method | 50 | Extract helpers |

Refactor before adding to a file that is over the limit.

## Structure

- One responsibility per file
- No circular imports: introduce a shared module instead
- Tests live next to the code they cover

## Hygiene

- No debug output or commented-out code in commits
- Handle errors at the boundary; never swallow them silently
- Errors shown to users are readable messages, not stack traces
- No hardcoded secrets

{{CODE_GUIDELINES_STACK}}
