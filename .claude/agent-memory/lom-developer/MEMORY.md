# Developer Agent Memory — Lom

*Read at session start. Update at session end. Keep it concise.*

---

## Codebase Map
*(Populate as the project grows)*

## Two-Layer Rule
- `/src/` = app code
- `/templates/` = what Lom generates for users
- Never hardcode scaffold content in `/src/` — always read from `/templates/`
- Token format: `{{PROJECT_NAME}}`, `{{PRODUCT_VISION}}`, `{{TECH_STACK}}`, `{{TARGET_USERS}}`

## Patterns Established
*(Add as conventions emerge)*

## Known Issues
*(Add bugs or tech debt flagged but not yet sliced)*

## Watch Out For
- `npx lom init` must work from a clean directory with no prior state
- Hidden folders (`.claude/`) must be written correctly — some tools skip dot folders

## Last Session
*(Update after each session)*
