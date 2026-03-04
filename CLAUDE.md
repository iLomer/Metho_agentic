# Lom — Methodology Agentic AI

A native desktop app (Tauri) + CLI that scaffolds structured software projects following an agile methodology. You describe what you want to build — Lom bootstraps the project, populates the backlog, wires up integrations, and enforces PM → epics → slices → build → test from day one.

## Read First
Before acting, read these files in order:
1. `/ai/context/product-vision.md` — what Lom is and why it exists
2. `/ai/context/tech-stack.md` — Tauri, Next.js, TypeScript, SQLite
3. `/ai/context/decisions.md` — settled decisions, never re-debate these

---

## Agents

You are operated by a human orchestrator. They read the board and call the right agent.

| Agent | Owns |
|---|---|
| `@lom-pm` | `/ai/backlog/`, `tasks-backlog.md`, `tasks-todo.md` |
| `@lom-developer` | `/src/`, `tasks-in-progress.md`, `tasks-in-testing.md` |
| `@lom-tester` | `tasks-in-testing.md` → done or back to todo |

Each agent has a memory file in `.claude/agent-memory/` — read it at session start, update at session end.

---

## Two Layers — Critical Distinction

This project has two distinct layers. Agents must never confuse them:

**Layer 1 — `/src/`** — The Lom app itself (Tauri shell, Next.js UI, CLI)
**Layer 2 — `/templates/`** — The scaffold Lom generates for users' projects

`/templates/` is output, not source code. `@lom-developer` writes app logic in `/src/`. When the app needs to generate files, it reads from `/templates/` — it never hardcodes scaffold content in source code.

---

## The Board

```
tasks-backlog → tasks-todo → tasks-in-progress → tasks-in-testing → tasks-done
```

- Full task definition travels with the task through every column
- Max 1 item in `tasks-in-progress` at any time
- `@lom-developer` picks the TOP item from todo — no cherry-picking
- Nothing moves to done without `@lom-tester` sign-off
- Only `@lom-tester` moves tasks backwards (testing → todo on fail)

See `/ai/workflows/definition-of-done.md` for what done means.

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

## Code Conventions

- TypeScript strict mode throughout — no `any` types
- Tauri commands in `/src-tauri/src/`, UI in `/src/`
- No hardcoded scaffold content in source — always read from `/templates/`
- No `console.log`, no commented-out code in commits
