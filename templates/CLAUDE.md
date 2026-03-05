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
| `@meto-pm` | `/ai/backlog/`, `tasks-backlog.md`, `tasks-todo.md` |
| `@meto-developer` | `/src/`, `tasks-in-progress.md`, `tasks-in-testing.md` |
| `@meto-tester` | `tasks-in-testing.md` → done or back to todo |

Each agent has a memory file in `.claude/agent-memory/` — read at session start, update at session end.

---

## Getting Started
Scaffolded by Meto. Call @meto-pm to populate backlog, then @meto-developer to build.

---

## The Board

```
tasks-backlog → tasks-todo → tasks-in-progress → tasks-in-testing → tasks-done
```

- Full task definition travels with the task through every column
- Max 1 item in `tasks-in-progress` at a time
- `@meto-developer` picks TOP item from todo — no cherry-picking
- Nothing moves to done without `@meto-tester` sign-off
- Only `@meto-tester` moves tasks backwards (testing → todo on fail)

See `/ai/workflows/definition-of-done.md` for done criteria.

---

## Agent Teams

This project supports Agent Teams. The lead agent can spawn teammates using `@meto-pm`, `@meto-developer`, `@meto-tester`.

**Coordination model:** Agent Teams has its own task system, but this project uses the kanban board (`tasks-backlog` through `tasks-done`) as the single source of truth for task state. Teammates must read and update the board files, not rely on Agent Teams' internal task tracking.

**File ownership is exclusive -- two teammates editing the same file causes overwrites.**

| Agent | Writes |
|---|---|
| `@meto-pm` | `/ai/` files, `tasks-backlog.md`, `tasks-todo.md` |
| `@meto-developer` | `/src/`, config files, `tasks-in-progress.md`, `tasks-in-testing.md` |
| `@meto-tester` | `tasks-in-testing.md`, `tasks-done.md`, `tasks-todo.md` (failed items) |

Each agent writes only its own memory file in `.claude/agent-memory/` -- never another agent's.

Teammates do NOT inherit the lead's conversation history. Each teammate reads CLAUDE.md and its agent definition fresh.

---

## Context Management

- **Session cadence:** Start a new session every 3-5 slices or when context feels sluggish
- **Session start:** Read CLAUDE.md, your agent memory file, and the board — then act
- **Session end:** Update your memory file with decisions, patterns, and what to pick up next
- **Context budget:** Grep before reading full files; read targeted line ranges; max 3 files open before acting
- **Red flag:** If you re-read a file you already read this session, note key info in memory instead

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
