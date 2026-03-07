# Swarm Workflow — {{PROJECT_NAME}}

## What is Swarm Mode

Each epic runs its own agent in parallel. Epic agents are scoped to their domain and cannot touch files owned by other epics. They report status every 3 completed tasks. The user stays in control at every checkpoint.

---

## Swarm vs Sprint

| | Sprint | Swarm |
|---|---|---|
| Tasks | One at a time, sequential | Parallel per epic |
| Agents | meto-developer (generic) | meto-epic-[id] (scoped) |
| Speed | Careful, deliberate | Faster on independent epics |
| Risk | Low | Medium — requires domain discipline |
| Best for | Solo, small scope, tight control | Multiple epics, independent domains |

---

## Starting a Swarm

1. `@meto-pm` confirms all epics are defined in `epics.md`
2. `@meto-pm` generates `ai/swarm/domain-map.md` — one domain per epic
3. `@meto-pm` generates one `epic-agent.md` per epic in `.claude/agents/`
4. `@meto-pm` initialises `ai/swarm/SWARM_AWARENESS.md` with active epic table
5. User launches epic agents — one per epic, in separate Claude Code sessions

---

## Checkpoint Rhythm

```
Epic agent reads todo -> identifies independent tasks -> launches in parallel
Each task: implement -> self-check -> move to testing
After 3 tasks complete (parallel or sequential):
-> Write checkpoint to SWARM_AWARENESS.md
-> Surface status to user
-> User runs: npx meto-cli status
-> User reviews: continue / intervene / reassign
-> Repeat
```

**Parallelism within an epic:** Independent tasks (no dependency chain) run in parallel using background agents or worktrees. Only tasks that depend on another's output run sequentially.

A checkpoint is NOT a blocker — if status is `on-track` the agent continues automatically. Only `blocked` status requires user intervention.

---

## npx meto-cli status

Reads `ai/swarm/SWARM_AWARENESS.md` and prints a formatted terminal report:

```
Last Swarm Checkpoint

Project: {{PROJECT_NAME}}
Duration: [start] – [latest checkpoint]

Epics Active:
- E1 · [name]   [n] tasks done
- E2 · [name]   [n] tasks in progress
- E3 · [name]   blocked — [reason]
- E4 · [name]   not started

Acceptance Criteria: [n] of [n] passed

Blockers:
- [EPIC_ID]: [description]

Next: [instruction to user]
```

Run at any time — not only at checkpoints. Gives a live read of the swarm state.

---

## Conflict Resolution Protocol

1. Epic agent detects it needs a file outside its domain
2. Agent logs conflict in `SWARM_AWARENESS.md` under Shared File Conflicts
3. Agent sets its status to `blocked`
4. Agent pauses — does NOT proceed
5. User runs `npx meto-cli status` — sees the blocker
6. User resolves: assigns ownership or approves shared edit
7. Agent continues only after user confirmation

---

## Ending a Swarm

A swarm ends when all epics reach 0 tasks in `tasks-todo.md` tagged to them and `@meto-tester` has signed off all items in `tasks-done.md`.

`@meto-pm` writes final swarm summary to `SWARM_AWARENESS.md`:
```
SWARM COMPLETE | [date] | [n] epics | [n] tasks | [n/n] AC passed
```
