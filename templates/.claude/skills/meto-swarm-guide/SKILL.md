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

The rest is derived: `npx meto-cli repair --swarm` creates the agent of each epic in `.claude/agents/epic-agent-[id].md` with its domain, and adds the epic to the table in `ai/swarm/SWARM_AWARENESS.md`. `/meto-swarm` runs it before every round, so there is nothing to keep in step by hand.

## Running it

Run `/meto-swarm`. The workflow repairs the swarm files, reads the swarm state, launches the epic agents that share no files, runs the tester on each epic that reaches `testing-ready`, and repeats until every epic is complete or nothing more can run. Which epics run together is decided by the script from the domain map, not by judgment.

- `/meto-swarm <what you want>` (or `{ "request": "..." }`) has `@meto-pm` slice the request into the board first, each slice assigned to the epic that owns its files.
- `/meto-swarm` with `{ "dryRun": true }` prints the plan and launches nothing.
- `{ "epics": ["E1", "E2"] }` limits the run; `{ "maxRounds": 3 }` caps the rounds.
- The result lists any file an epic agent changed outside its domain. Review those before pushing.

Without workflows, launch the agents by hand: `@meto-epic-[id]` for each epic that is `not-started` or `on-track` and shares no files or feature with one already running, then `@meto-tester` scoped to each epic that is `testing-ready`. The meto mod refuses a launch that overlaps a running epic.

`npx meto-cli status` shows progress at any time; `npx meto-cli status --json` is what the workflow reads.

## After the first backlog

The swarm keeps working for as long as slices arrive, because every run starts from the board:
- A new slice for an epic that is `complete` reopens it (`on-track`).
- A new epic needs a heading in `ai/backlog/epics.md` and a row in `ai/swarm/domain-map.md`; its agent and table row are created on the next run. Without the domain row the epic is held, and the run says so.
- A slice with `**Epic:** none` (files of several epics, or shared files) is built by `@meto-developer` after the epic agents, one at a time.

In the main session, the meto mod refuses an edit inside an epic's domain and points to `/meto-swarm`. Set its `leadEdits` option to `warn` or `allow` if you want the main session to make small fixes itself.

`npx meto-cli repair --check` shows what is out of step without writing; `npx meto-cli repair` fixes it, and also brings meto's own files up to the installed version.

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

A swarm round is done when every epic is `complete`; new slices start the next one. To close a swarm for good, `@meto-pm` adds a summary line to `ai/swarm/SWARM_AWARENESS.md`:

```
SWARM COMPLETE | [date] | [n] epics | [n] tasks | [n/n] AC passed
```
