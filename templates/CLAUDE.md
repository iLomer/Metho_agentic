# {{PROJECT_NAME}}

{{PRODUCT_VISION}}

## Read First
1. `/ai/context/product-vision.md` — what and why
2. `/ai/context/tech-stack.md` — stack and constraints
3. `/ai/context/decisions.md` — settled, never re-debate

---

## Agents

Human orchestrator reads the board and calls the right agent.

| Agent | Owns |
|---|---|
| `@lom-pm` | `/ai/backlog/`, `tasks-backlog.md`, `tasks-todo.md` |
| `@lom-developer` | `/src/`, `tasks-in-progress.md`, `tasks-in-testing.md` |
| `@lom-tester` | `tasks-in-testing.md` → done or back to todo |

Each agent has a memory file in `.claude/agent-memory/` — read at session start, update at session end.

---

## Getting Started
Scaffolded by Lom. Call @lom-pm to populate backlog, then @lom-developer to build.

---

## The Board

```
tasks-backlog → tasks-todo → tasks-in-progress → tasks-in-testing → tasks-done
```

- Full task definition travels with the task through every column
- Max 1 item in `tasks-in-progress` at a time
- `@lom-developer` picks TOP item from todo — no cherry-picking
- Nothing moves to done without `@lom-tester` sign-off
- Only `@lom-tester` moves tasks backwards (testing → todo on fail)

See `/ai/workflows/definition-of-done.md` for done criteria.

---

## Commit Format

```
feat(scope): description [dev-agent]
fix(scope): description [dev-agent]
docs(scope): description [pm-agent]
test(scope): description [tester-agent]
chore(scope): description [bootstrap]
```

---

## Stack
{{TECH_STACK}}

## Code Conventions
{{CODE_CONVENTIONS}}
