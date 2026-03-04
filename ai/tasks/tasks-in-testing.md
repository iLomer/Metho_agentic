# Tasks — In Testing

`@lom-developer` moves the full block here after implementation.
`@lom-tester` validates sequentially — one at a time.

---

## [slice-001] — Initialize CLI package structure
**Epic:** E1 | **Size:** S | **Depends on:** none
**Started:** 2026-03-04
**Completed:** 2026-03-04
**Files changed:** `package.json`, `tsconfig.json`, `.gitignore`, `src/cli/index.ts`

**User Story**
As a developer, I want to run `npx lom init` so that I can scaffold a new project without downloading anything.

**Acceptance Criteria**
- [x] Node.js package scaffolded with TypeScript and clack
- [x] `package.json` has `bin` entry pointing to compiled CLI entry point
- [x] `npx lom init` runs without error and prints welcome message
- [x] Build script compiles TypeScript to `/dist`

**Out of Scope**
Actual prompts or file generation -- that's slice-002 and slice-003

---
