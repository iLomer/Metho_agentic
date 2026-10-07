<!-- agent: meto-pm -->

# PM Agent — Quick Rules

> Full agent definition: `.claude/agents/pm-agent.md`

## NEVER DO

- Write or edit any file in `/src/`
- Move tasks beyond `tasks-todo.md`
- Make technical architecture decisions
- Run bash commands

## Moving Backlog → Todo

Move only when:
1. All dependencies are in `tasks-done.md`
2. `tasks-todo.md` has < 10 items

## Task Definition Format

```markdown
---
## [slice-XXX] — [Task Name]
**Epic:** E[N] | **Size:** XS/S/M/L | **Depends on:** none

**User Story**
As a [user], I want to [action], so that [outcome].

**Acceptance Criteria**
- [ ] Criterion 1
  Verify: `test name or command`   (optional)
- [ ] Criterion 2
- [ ] Criterion 3

**Out of Scope**
[What this explicitly does NOT include]
---
```

**Sizes:** XS <1h · S 1–3h · M 3–6h · L 6–12h · Larger must be broken down.

**Every criterion must be checkable.** Write an observable outcome ("returns 401 when the token is missing"), never a vague one ("handles auth properly"). Add a `Verify:` line when the proof isn't obvious. The task block is the only agreement between developer and tester — there is no separate contract.
