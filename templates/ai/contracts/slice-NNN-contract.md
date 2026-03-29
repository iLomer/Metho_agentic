# Sprint Contract — [{{SLICE_ID}}] {{SLICE_NAME}}

**Epic:** {{EPIC_ID}}
**Status:** DRAFT | AGREED | SIGNED

<!-- This file must exist and be SIGNED before @meto-developer writes a single line of implementation code. -->
<!-- Fill in every section. Vague entries are grounds for @meto-tester to reject sign-off. -->

---

## 1. Proposed Criteria

<!-- Copy the Acceptance Criteria block verbatim from the PM slice definition in tasks-todo.md. -->
<!-- Do not paraphrase. Word-for-word parity with the PM definition is required. -->

_Paste the raw AC list from the PM slice definition here._

---

## 2. Agreed Test Behaviors

<!-- Translate each AC into a concrete, runnable test behavior. -->
<!-- Format: "Given [setup], when [action], then [observable outcome]." -->
<!-- One behavior per AC minimum. Add more if a single AC has multiple observable outcomes. -->
<!-- Tests must be runnable — no "verify manually" entries. -->

| # | Given | When | Then |
|---|---|---|---|
| 1 | | | |
| 2 | | | |
| 3 | | | |

<!-- Add rows as needed. Remove placeholder rows that remain empty. -->

---

## 3. Edge Cases

<!-- List boundary conditions and failure modes that the AC list does not explicitly cover. -->
<!-- @meto-tester must add at least one edge case the developer did not list before signing. -->
<!-- Format: bullet list. Each entry names the condition and the expected behavior. -->

- **[Edge case name]:** [Expected behavior when this condition occurs.]

<!-- NEVER DO: Leave this section empty. Every slice has at least one edge case. -->

---

## 4. Definition of Done

<!-- List the exact commands to run that prove the slice is complete. -->
<!-- No verbal claims. Each entry must be a shell command or a specific observable check. -->
<!-- These commands will be run verbatim by @meto-tester to validate the slice. -->

- [ ] `[verification command]` passes
- [ ] `[verification command]` passes
- [ ] No `any` types (`npx tsc --noEmit` clean)
- [ ] No `console.log` left in committed code
- [ ] No commented-out code in committed files
- [ ] `npm run build` passes

<!-- Extend this list with slice-specific commands. Do not remove the standard checks above. -->

---

## 5. Out of Scope

<!-- Enumerate what this slice explicitly does NOT cover. -->
<!-- This protects both agents: developer does not over-build, tester does not over-reject. -->
<!-- Copy from the PM slice definition and add any clarifications agreed during negotiation. -->

- [Item from PM out-of-scope list]

---

## 6. Sign-off

<!-- Sign-off is BLOCKING. @meto-developer may not merge or mark the task complete without both signatures. -->
<!-- @meto-tester may not sign an incomplete contract (missing sections, vague behaviors, empty edge cases). -->

| Role | Agent | Initials | Date | Notes |
|---|---|---|---|---|
| Developer | @meto-developer | | | |
| Tester | @meto-tester | | | |

<!-- NEVER DO (@meto-developer): Write implementation code before this table has both signatures filled in. -->
<!-- NEVER DO (@meto-tester): Sign off when any section above is blank, vague, or copied without review. -->
