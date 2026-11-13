---
name: meto-swarm-guide
description: How swarm mode works in this project - starting a swarm, the domain map, checkpoints, the testing phase, resolving file conflicts, and ending a swarm. Use when setting up or running parallel epic agents, or when an epic is blocked on a file outside its domain.
---

# Swarm mode

Each epic has its own agent, scoped to the files its epic owns. Epics whose files and features don't overlap run in parallel; the tester validates one epic at a time.

Use swarm when epics own distinct files and a task cycling back through testing is an acceptable cost. If epics share files, or one blocked epic would stall the rest, work in sprint order with `@meto-developer` instead.

## Starting a swarm

`@meto-pm` prepares it:
1. Confirm every epic is defined in `ai/backlog/epics.md`.
2. Fill in `ai/swarm/domain-map.md`: the paths each epic owns, and the shared files that need coordination.
3. Make sure each epic has an agent in `.claude/agents/epic-agent-[id].md` with its domain filled in.
4. Fill in the epic table in `ai/swarm/SWARM_AWARENESS.md`.

## Running it

Run `/meto-swarm`. The workflow reads the swarm state, launches the epic agents that share no files, runs the tester on each epic that reaches `testing-ready`, and repeats until every epic is complete or nothing more can run. Which epics run together is decided by the script from the domain map, not by judgment.

- `/meto-swarm` with `{ "dryRun": true }` prints the plan and launches nothing.
- `{ "epics": ["E1", "E2"] }` limits the run; `{ "maxRounds": 3 }` caps the rounds.
- The result lists any file an epic agent changed outside its domain. Review those before pushing.

Without workflows, launch the agents by hand: `@meto-epic-[id]` for each epic that is `not-started` or `on-track` and shares no files or feature with one already running, then `@meto-tester` scoped to each epic that is `testing-ready`. The meto mod refuses a launch that overlaps a running epic.

`npx meto-cli status` shows progress at any time; `npx meto-cli status --json` is what the workflow reads.

## Checkpoints

An epic agent appends a line to `[swarm:checkpoints]` in `ai/swarm/SWARM_AWARENESS.md` after every 3 completed tasks. A checkpoint with status `on-track` needs nothing from you. `blocked` and `testing-ready` do.

## Testing phase

When an epic's todo is empty, its agent sets the epic to `testing-ready`. The tester then processes only that epic's slices in `tasks-in-testing.md`, one at a time:
- All pass → the tester sets the epic to `complete`.
- Any fail → the failed slices return to `tasks-todo.md`, the epic goes back to `on-track`, and its agent picks them up on the next round.

Testing one epic never blocks another.

## A file outside the domain

1. The epic agent logs the conflict under `[swarm:conflicts]` in `ai/swarm/SWARM_AWARENESS.md`, sets its status to `blocked`, and stops.
2. You decide: assign the file to one epic in `ai/swarm/domain-map.md`, or approve a shared edit.
3. The agent continues on the next run.

Shared config files such as `package.json` always go through this.

## Ending a swarm

A swarm is done when every epic is `complete`. `@meto-pm` then adds a summary line to `ai/swarm/SWARM_AWARENESS.md`:

```
SWARM COMPLETE | [date] | [n] epics | [n] tasks | [n/n] AC passed
```
