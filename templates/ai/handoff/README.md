# ai/handoff/

This directory contains the current session handoff file. It exists so that any agent or session can pick up exactly where the last one left off without reconstructing state from scratch.

---

## The Model: Overwrite Per Session

`current.md` is **overwritten at the end of every session** by the closing agent.

There is only ever one file: `current.md`. There is no `previous.md`, no numbered history, no appending. The file always reflects the most recent completed session — nothing older.

**Why overwrite instead of append?**

A single file that is always current is faster to read and impossible to misread. An appended file grows unbounded and forces the reader to scan for the latest entry. Overwrite keeps the signal high.

---

## Git History Is the Audit Trail

Because `current.md` is committed at the end of every session, every historical handoff is preserved in git. To review what was handed off two sessions ago:

```
git log --oneline -- ai/handoff/current.md
git show <commit-hash>:ai/handoff/current.md
```

No information is lost. The file is just always fresh.

---

## All Agents Must Read This File at Session Start

Before reading any task file, memory file, or context document, every agent must read `ai/handoff/current.md`. It is the fastest path to situational awareness.

**Session start order:**

1. Read `ai/handoff/current.md` — understand sprint state and next action
2. Read your agent memory file (`.claude/agent-memory/<role>/MEMORY.md`)
3. Read the task definition for the current slice
4. Proceed

If `ai/handoff/current.md` does not exist (new project, or first session ever), fall back to `ai/tasks/tasks-in-progress.md` and your agent memory file.

---

## All Agents Must Write This File at Session End

Before ending a session, every agent must overwrite `current.md` with the latest state. Copy `templates/ai/handoff/current.md`, fill in every section, commit it.

**The handoff write is not optional.** It is the last action of every session, before the session closes. If context is approaching the limit, write the handoff before doing anything else.

---

## Template

The blank template lives at `templates/ai/handoff/current.md`. Copy it, replace all `{{TOKEN}}` placeholders, and commit.

| Token | Description |
|---|---|
| `{{SLICE_ID}}` | The slice being worked on, e.g. `slice-092` |
| `{{AGENT_NAME}}` | Canonical agent name, e.g. `@meto-developer` |
| `{{DATE}}` | Session date in YYYY-MM-DD format |
| `{{TIMESTAMP}}` | ISO 8601 timestamp of when the handoff was written |

---

## NEVER DO

- End a session without overwriting `current.md`
- Append to `current.md` instead of overwriting it
- Create numbered files (`handoff-001.md`, `handoff-2026-03-29.md`) — git history is the archive
- Leave placeholder tokens (`{{SLICE_ID}}`) unfilled in a committed handoff
- Skip the handoff because "nothing changed" — always write it, even for short sessions
