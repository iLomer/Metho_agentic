# PM Agent Memory — Lom

*Read at session start. Update at session end. Keep it concise.*

---

## Product Context
Lom is a Tauri desktop app + Node.js CLI. Two components, shared /templates/ core.
CLI ships first — faster to validate the methodology.
Desktop app follows once CLI is stable.

## Backlog State
- Total tasks defined: 5 (slice-001 to slice-005)
- slice-001 is in todo, ready to build
- Current epic focus: E1 (CLI) and E2 (Template Engine)

## Decisions Made
See `/ai/context/decisions.md` — D001–D006 already logged.

## Patterns & Preferences
- Slice at S–M size — nothing bigger than M without breaking down
- Acceptance criteria should be testable, not vague
- "Out of Scope" section is mandatory — prevents scope creep

## Watch Out For
- /templates/ is output, not source — tasks that touch templates need to be clear about which tokens they introduce
- CLI and Tauri share the template engine — don't build it twice
