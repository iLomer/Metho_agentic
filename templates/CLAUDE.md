# {{PROJECT_NAME}}

{{PRODUCT_VISION}}

{{WORKFLOW_SESSION_START}}

## Read First
1. `/ai/context/product-vision.md` — what and why
2. `/ai/context/tech-stack.md` — stack and constraints
3. `/ai/context/decisions.md` — settled, never re-debate

---

{{WORKFLOW_AGENTS_SECTION}}

---

## Daily Workflow

{{WORKFLOW_DAILY_WORKFLOW}}

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
- **The task block is the agreement:** acceptance criteria + Out of Scope define done. No separate contract or sign-off before coding.
- **XS/S slices:** developer self-validates and moves straight to done (no tester)
- **M/L slices:** must go through `@meto-tester` before done
- Only `@meto-tester` moves tasks backwards (testing → todo on fail) — the fail note lists the failed criteria, and the retest checks only those plus the full test run
- **The board is the status:** agents don't message each other — their final reply is the report, and the next agent reads the board
- **Batch mode:** developer may process multiple slices per session, committing once at the end
- **Parallel work:** slices may run at the same time only when nothing links them — no `Needs` between them, no shared files, and not parts of the same feature. Use `meto ready` to find candidates. No fixed agent cap: independent slices in separate worktrees can all run

See `/ai/workflows/definition-of-done.md` for done criteria.

### meto mod (`.claude/skills/meto/`)

Claude Code loads it automatically. It enforces the rules above instead of trusting prompts:
- `/meto-board` — the board in a side pane, topped by the session: model, context, cost, git user, branch and changes, tokens; `/meto-slice [count]` — the next free slice IDs, checked against origin so two sessions never take the same number
- Refuses an epic agent that is already running, shares files with a running one (`ai/swarm/domain-map.md`), or needs a slice still in progress
- Refuses an epic agent's edit outside its domain, and any meto agent's separate message — the final answer is the report
- Nothing above or below the prompt: swarm status and the handoff reminder live in `/meto-board`; the `swarmBand` setting in `/config` adds a swarm row above the prompt

### Task Definition Format

Each task block uses this structure:

```
## [slice-NNN] -- Title
**Epic:** ENN | **Size:** XS/S/M/L | **Depends on:** slice-NNN or none
**Needs:** slice-NNN, slice-NNN   (optional — omit if none)
**Blocks:** slice-NNN, slice-NNN  (optional — omit if none)

**Acceptance Criteria**
- [ ] Criterion — must be checkable (an observable outcome, not "works correctly")
  Verify: `test name or command`   (optional)

**Out of Scope**
```

> `Needs` lists tasks that must be in `tasks-done.md` before this task is safe to start. `Blocks` lists tasks that cannot start until this one is done. Both fields are read by `meto ready`.

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

Teammates do NOT inherit the lead's conversation history. Their rules live only in their agent definition (`.claude/agents/`), which loads when the agent runs.

---

## Context Management

- **Session cadence:** Start a new session every 10-15 slices or when context feels sluggish
- **Session start — checklist (run in order):**
  1. **Read `ai/handoff/current.md`** — understand current sprint state and next action before reading anything else
     > **Fallback:** If `ai/handoff/current.md` does not exist, read `ai/tasks/tasks-in-progress.md` and the memory file for your agent role instead.
  2. Read your agent memory file (`.claude/agent-memory/<your-role>/MEMORY.md`)
  3. Read the board (`ai/tasks/tasks-in-progress.md`) — then act
- **Session end — blocking steps (must complete before closing the session):**
  1. **[BLOCKING] The main session writes `ai/handoff/current.md` once, using the handoff template.** Subagents don't write it — their final reply goes into it.
  2. Each agent that ran updates its own memory file with decisions, patterns, and what to pick up next
  > **Context limit reminder:** If context is near the limit, write the handoff before doing anything else — it is the most important session-end action.
- **Context budget:** Grep before reading full files; read targeted line ranges; max 10 files open before acting
- **Red flag:** If you re-read a file you already read this session, note key info in memory instead

---

## Workflow Rules

- **Plan first:** For any task with 3+ steps or architectural decisions, enter plan mode before writing code. If something goes sideways, STOP and re-plan.
- **Test first, always:** Write the failing test before implementation — one test per acceptance criterion (use its `Verify:` line when present). Watch it fail, then make it pass. Code written before a test = delete and restart.
- **Systematic debugging:** Root-cause first — read the error, trace the call, form a hypothesis. If 3 distinct fixes fail, stop and re-plan rather than trying a fourth.
- **Verify before done:** Never mark a task complete without running the verification command in the current session. No verbal claims — show the output.
- **Minimal impact:** Changes touch only what's necessary. No temporary fixes — find root causes.

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
