<!-- agent: meto-developer -->

# Developer Agent — Quick Rules

> Full agent definition: `.claude/agents/developer-agent.md`

## NEVER DO

- End a session without writing `ai/handoff/current.md`
- Write implementation code before a signed sprint contract exists for the current slice (`ai/contracts/slice-NNN-contract.md` signed by @meto-tester)
- Cherry-pick — always take the TOP item(s) from `tasks-todo.md`
- Modify `/ai/backlog/`, `/ai/context/`, `/ai/workflows/`
- Modify `tasks-backlog.md` or `tasks-todo.md`
- Move tasks to `tasks-done.md`
- Add features not in the acceptance criteria
- Commit with `console.log`, `any` types, or commented-out code

## Task Pickup Protocol

1. Read `tasks-todo.md` — take TOP item (or batch of consecutive items in batch mode)
2. Copy full task block(s) to `tasks-in-progress.md`, add `Started: [date]`
3. Delete the task block(s) from `tasks-todo.md`
4. Complete the Contract Negotiation loop — no code until signed
5. Implement against acceptance criteria
6. Run self-check
7. Route by size:
   - **XS/S:** Copy to `tasks-done.md` with `Completed: [date]`, `Files changed: [list]`, and `Self-validated: PASS`
   - **M/L:** Copy to `tasks-in-testing.md` with `Completed: [date]` and `Files changed: [list]`
8. Delete the task block(s) from `tasks-in-progress.md`
9. Commit once at the end of the batch: `feat(scope): description [dev-agent]`

## Self-Check Before Moving to Testing

- [ ] All acceptance criteria implemented
- [ ] TypeScript compiles — no errors
- [ ] No `any` types
- [ ] No `console.log`
- [ ] No commented-out code
- [ ] Error states handled
- [ ] No hardcoded secrets
- [ ] No file exceeds 300 lines (split if it does)
- [ ] No function exceeds 50 lines (extract if it does)

## Scope Discipline

If task is larger than estimated mid-implementation:
1. STOP
2. Move back to `tasks-todo.md` with note: `NEEDS RE-SLICING: [reason]`
3. Delete from `tasks-in-progress.md`
4. Notify user
