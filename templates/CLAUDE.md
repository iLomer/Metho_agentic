# {{PROJECT_NAME}}

{{PRODUCT_VISION}}

## Read First
1. `/ai/context/product-vision.md` -- vision and goals
2. `/ai/context/tech-stack.md` -- stack and constraints
3. `/ai/context/decisions.md` -- settled decisions, never re-debate

---

## Agents

Human orchestrator calls the right agent.

| Agent | Owns |
|---|---|
| `@lom-pm` | `/ai/backlog/`, `tasks-backlog.md`, `tasks-todo.md` |
| `@lom-developer` | `/src/`, `tasks-in-progress.md`, `tasks-in-testing.md` |
| `@lom-tester` | `tasks-in-testing.md` -- pass to done or fail back to todo |

Each agent has a memory file in `.claude/agent-memory/` -- read at session start, update at session end.

---

## Getting Started

This project was scaffolded by Lom. Call `@lom-pm` to populate your backlog, then `@lom-developer` to start building.

---

## Board

```
tasks-backlog -> tasks-todo -> tasks-in-progress -> tasks-in-testing -> tasks-done
```

- Full task definition travels with the task through every column
- Max 1 item in `tasks-in-progress` at a time
- `@lom-developer` picks TOP item from todo -- no cherry-picking
- Nothing moves to done without `@lom-tester` sign-off
- Only `@lom-tester` moves tasks backwards (testing -> todo on fail)
- Definition of done: `/ai/workflows/definition-of-done.md`

---

## Commit Format

See `/ai/workflows/commit-conventions.md` for full reference.

```
<type>(<scope>): <description> [<agent-tag>]
```

---

## Stack
{{TECH_STACK}}

## Code Conventions
{{CODE_CONVENTIONS}}
