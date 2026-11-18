# {{PROJECT_NAME}}

{{PRODUCT_VISION}}

{{WORKFLOW_SESSION_START}}

## Context
- `ai/context/product-vision.md` — what and why
- `ai/context/tech-stack.md` — stack and constraints
- `ai/context/decisions.md` — settled decisions; flag a conflict instead of reopening one

---

{{WORKFLOW_AGENTS_SECTION}}

---

## Workflow

{{WORKFLOW_DAILY_WORKFLOW}}

## The Board

```
tasks-backlog → tasks-todo → tasks-in-progress → tasks-in-testing → tasks-done
```

The board files in `ai/tasks/` are the single source of truth for task state, including when Agent Teams is on. The full task block moves with the task through every column.

- `@meto-developer` takes the top ready item from todo; the order is the PM's priority
- The task block is the agreement: acceptance criteria plus Out of Scope define done
- XS/S slices: the developer self-validates and moves them straight to done
- M/L slices: go through `@meto-tester`, who alone sends work back (testing → todo, with the failed criteria listed; a retest checks only those)
- Agents don't message each other: an agent's final reply is its report, and the next agent reads the board
- Slices run in parallel only when nothing links them: no `Needs` between them, no shared files, not parts of the same feature. `meto ready` lists candidates

### Task format

```
## [slice-NNN] -- Title
**Epic:** ENN | **Size:** XS/S/M/L | **Depends on:** slice-NNN or none
**Model:** haiku / sonnet / opus     (optional)
**Needs:** slice-NNN, slice-NNN   (optional)
**Blocks:** slice-NNN, slice-NNN  (optional)

**Acceptance Criteria**
- [ ] An observable outcome, e.g. "returns 401 when the token is missing"
  Verify: `test name or command`   (optional)

**Out of Scope**
```

`Needs` must all be in `tasks-done.md` before the task starts; `Blocks` lists tasks waiting on this one. `meto ready` reads both.

### Model routing

`@meto-pm` sets a slice's `Model` from this table, and the meto mod launches the building agent on it. A slice without the line runs on the agent's default (`sonnet`). Edit the table to match your plan and budget.

| Work | Model |
|---|---|
| Database schema, migrations, auth, access rules, payments | `opus` |
| Feature code | `sonnet` |
| Copy, labels, config values, docs | `haiku` |

### meto mod (`.claude/skills/meto/`)

Claude Code loads it automatically, and it enforces the rules above:
- `/meto-board` shows the board and session in a side pane; `/meto-slice [count]` reserves the next free slice IDs, checked against origin
- It refuses an epic agent that is already running, shares files with a running one, or needs a slice still in progress
- It launches `@meto-developer` and the epic agents on the model their next slice asks for (see Model routing)
- It refuses an edit outside the agent's files (see the Writes column above; an epic agent's domain is in `ai/swarm/domain-map.md`), and a separate message from a meto agent

## Handoff and memory

- `ai/handoff/current.md` is loaded into every new session. Before a session ends, the main session overwrites it with: the active slice and its column, what was finished, blockers, the next action, and decisions not yet in `decisions.md`. Subagents don't write it; git history keeps earlier handoffs.
- Each agent has project memory: Claude Code loads `.claude/agent-memory/<agent>/MEMORY.md` into that agent, and the agent keeps its own file current.

## Development rules

- Tests come first: one failing test per acceptance criterion, then the implementation.
- A task is done only after its verification commands ran in the current session, with the output pasted into the task block.
- Done criteria: `ai/workflows/definition-of-done.md`. Code rules: `ai/workflows/code-guidelines.md`; stack rules in `.claude/rules/` load when a matching file is touched.

## Commit Format

```
feat(scope): description [dev-agent]
fix(scope): description [dev-agent]
docs(scope): description [pm-agent]
test(scope): description [tester-agent]
chore(scope): description [bootstrap]
```

## Stack
{{TECH_STACK}}

## Code Conventions
{{CODE_CONVENTIONS}}
<!-- Checked by the Drift Watcher -->
