# Developer Agent Memory — Lom

*Read at session start. Update at session end. Keep it concise.*

---

## Codebase Map
- `package.json` -- CLI package "lom", bin entry at `./dist/cli/index.js`
- `tsconfig.json` -- strict, ESM (Node16), compiles `src/` to `dist/`
- `src/cli/index.ts` -- CLI entry point, uses @clack/prompts, handles `init` command
- `.gitignore` -- ignores node_modules/, dist/, .env
- Task board files live in `/ai/tasks/` (not root level)

## Two-Layer Rule
- `/src/` = app code
- `/templates/` = what Lom generates for users
- Never hardcode scaffold content in `/src/` — always read from `/templates/`
- Token format: `{{PROJECT_NAME}}`, `{{PRODUCT_VISION}}`, `{{TECH_STACK}}`, `{{TARGET_USERS}}`

## Patterns Established
- ESM throughout (`"type": "module"` in package.json)
- clack for all CLI output (intro/outro/log.info/log.step/log.warning)
- CLI entry point pattern: parse `process.argv[2]` for command, branch on it
- Build: `npm run build` runs `tsc`, output lands in `dist/`

## Known Issues
*(Add bugs or tech debt flagged but not yet sliced)*

## Watch Out For
- `npx lom init` must work from a clean directory with no prior state
- Hidden folders (`.claude/`) must be written correctly — some tools skip dot folders

## Last Session
- **Date:** 2026-03-04
- **Task:** slice-001 -- Initialize CLI package structure
- **Status:** Completed, moved to tasks-in-testing
- **What was done:** Created package.json, tsconfig.json, .gitignore, src/cli/index.ts. Installed deps. Verified `npx lom init` works. Pushed to https://github.com/iLomer/Metho_agentic
- **Remote:** origin = https://github.com/iLomer/Metho_agentic.git
- **Next up:** slice-002 (check tasks-todo.md)
