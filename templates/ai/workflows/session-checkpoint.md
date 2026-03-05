# Session Checkpoint

Write this at session end. Paste it into the next session's first message.

---

## Checkpoint Template

```
## Session Checkpoint — [date]

### Completed
- [slice-XXX] — description — PASS/IN-TESTING

### In Progress
- [slice-XXX] — description — what's left

### Decisions Made
- [decision] — rationale (move to decisions.md if permanent)

### Files Changed
- `path/to/file` — what changed

### Blocked On
- [blocker] — who/what can unblock

### Next Session Should
1. [first action]
2. [second action]
```

---

## Session Resume Protocol

1. Paste the checkpoint into your first message
2. Read CLAUDE.md and your agent memory file
3. Read the board (`tasks-todo.md`, `tasks-in-progress.md`, `tasks-in-testing.md`)
4. Pick up where the checkpoint says — don't re-read files already summarized

---

## When to Force a New Session

- Context feels sluggish (repeating yourself, forgetting earlier decisions)
- 3-5 slices completed since last fresh session
- Switching between agents (PM → Developer → Tester)
- After a major refactor or architecture change
- When the checkpoint itself exceeds 30 lines
