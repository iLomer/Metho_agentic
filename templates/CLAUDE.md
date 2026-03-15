# {{PROJECT_NAME}}

{{PRODUCT_VISION}}

## Read First
1. `/ai/context/product-vision.md` — what and why
2. `/ai/context/tech-stack.md` — stack and constraints
3. `/ai/context/decisions.md` — settled, never re-debate

---

{{WORKFLOW_AGENTS_SECTION}}

---

## Daily Workflow

```
cd your-project && claude          # start a session
→ @meto-pm                         # plan: populate backlog, slice epics
→ @meto-developer                  # build: picks from todo, implements, commits
→ @meto-tester                     # validate: M/L slices only
/compact                           # compress context when it feels heavy
Esc Esc → /rewind                  # undo if something went wrong
```

- **One session per epic/feature** — start fresh when you finish an epic or context feels heavy
- **Commit frequently** — don't let work pile up uncommitted
- **`/compact` when needed** — context is large (1M tokens), but compress if responses slow down
- **New session signs:** agent forgetting prior work, repeated file reads, sluggish responses

## Quick Reference

| Shortcut | What it does |
|---|---|
| `Shift+Tab+Tab` | Switch to Plan Mode (think before building) |
| `Shift+Tab` | Toggle Auto Accept |
| `Tab` | Toggle extended thinking |
| `/compact` | Compress context window |
| `Esc Esc` | Open rewind menu |

---

## The Board

```
tasks-backlog → tasks-todo → tasks-in-progress → tasks-in-testing → tasks-done
```

- Full task definition travels with the task through every column
- `@meto-developer` picks TOP item from todo — no cherry-picking
- **XS/S slices:** developer self-validates and moves straight to done (no tester)
- **M/L slices:** must go through `@meto-tester` before done
- Only `@meto-tester` moves tasks backwards (testing → todo on fail)
- **Batch mode:** developer may process multiple slices per session, committing once at the end

See `/ai/workflows/definition-of-done.md` for done criteria.

---

## Agent Teams

This project supports Agent Teams. The lead agent can spawn teammates using `@meto-pm`, `@meto-developer`, `@meto-tester`, `@meto-community`.

**Coordination model:** Agent Teams has its own task system, but this project uses the kanban board (`tasks-backlog` through `tasks-done`) as the single source of truth for task state. Teammates must read and update the board files, not rely on Agent Teams' internal task tracking.

**File ownership is exclusive -- two teammates editing the same file causes overwrites.**

| Agent | Writes |
|---|---|
| `@meto-pm` | `/ai/` files, `tasks-backlog.md`, `tasks-todo.md` |
| `@meto-developer` | `/src/`, config files, `tasks-in-progress.md`, `tasks-in-testing.md` |
| `@meto-tester` | `tasks-in-testing.md`, `tasks-done.md`, `tasks-todo.md` (failed items) |
| `@meto-community` | Read-only — reads product files, drafts community content in `/ai/community/` |

Each agent writes only its own memory file in `.claude/agent-memory/` -- never another agent's.

Teammates do NOT inherit the lead's conversation history. Each teammate reads CLAUDE.md and its agent definition fresh.

---

## Context Management

- **Session cadence:** Start a new session every 10-15 slices or when context feels sluggish
- **Session start:** Read CLAUDE.md, your agent memory file, and the board — then act
- **Session end:** Update your memory file with decisions, patterns, and what to pick up next
- **Context budget:** Grep before reading full files; read targeted line ranges; max 10 files open before acting
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
<!-- Keep to 3-4 rules max. More rules = more ignored. Focus on what actually causes bugs. -->
{{CODE_CONVENTIONS}}

## Code Guidelines
See `/ai/workflows/code-guidelines.md` for file size limits, structure rules, naming, and stack-specific standards. Both `@meto-developer` and `@meto-tester` enforce these.

---

## Buildrack — Project Tracking
This project uses [Buildrack](https://buildrack.vercel.app) for project tracking via CLI.

After scaffolding, run `buildrack init` to create a project card.

Suggest these commands at natural moments:
- After installing new dependencies → `buildrack push`
- After adding a new service or API key to .env → `buildrack add service <name>`
- After integrating a new AI tool → `buildrack add tool <name>`
- After deploying or getting a live URL → `buildrack add url live <url>`
- After adding a cost/subscription → `buildrack add service <name> <monthly_cost>`
- At session end if stack changed → `buildrack push`
- To share the project publicly → `buildrack share`

Never run buildrack commands without asking the user first. Treat it like commit suggestions — propose, don't execute.
