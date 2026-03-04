# Tasks — Backlog

Full task definitions. `@lom-pm` owns this file.
**Prioritize:** CLI first (E1, E2) → Tauri shell (E3) → integrations (E5)

---

## [slice-001] — Initialize CLI package structure
**Epic:** E1 | **Size:** S | **Depends on:** none

**User Story**
As a developer, I want to run `npx lom init` so that I can scaffold a new project without downloading anything.

**Acceptance Criteria**
- [ ] Node.js package scaffolded with TypeScript and clack
- [ ] `package.json` has `bin` entry pointing to compiled CLI entry point
- [ ] `npx lom init` runs without error and prints welcome message
- [ ] Build script compiles TypeScript to `/dist`

**Out of Scope**
Actual prompts or file generation — that's slice-002 and slice-003

---

## [slice-002] — Project brief prompts
**Epic:** E1 | **Size:** M | **Depends on:** slice-001

**User Story**
As a developer running `lom init`, I want to be asked the right questions so that the scaffold reflects my actual project.

**Acceptance Criteria**
- [ ] Prompts collect: project name, one-line description, target users, tech stack (select or custom), output directory
- [ ] Stack options include: Next.js + Supabase, React Native, Node.js CLI, custom
- [ ] User can cancel at any point cleanly
- [ ] Collected answers stored as a typed `ProjectBrief` object

**Out of Scope**
Writing any files — that's slice-003

---

## [slice-003] — Template rendering engine
**Epic:** E2 | **Size:** M | **Depends on:** slice-002

**User Story**
As the CLI, I want to render `/templates/` with the user's project brief so that every generated file has real content instead of placeholders.

**Acceptance Criteria**
- [ ] Template renderer replaces `{{PROJECT_NAME}}`, `{{PRODUCT_VISION}}`, `{{TECH_STACK}}`, `{{TARGET_USERS}}` tokens
- [ ] Renders all files from `/templates/` into the target output directory
- [ ] Preserves folder structure exactly
- [ ] Hidden folders (`.claude/`) are written correctly

**Out of Scope**
Stack-specific conditional templates — v2

---

## [slice-004] — Write scaffold to disk
**Epic:** E1 | **Size:** S | **Depends on:** slice-003

**User Story**
As a developer, after answering prompts I want the scaffold written to my chosen directory so I can open it immediately.

**Acceptance Criteria**
- [ ] Output directory created if it doesn't exist
- [ ] All rendered template files written to disk
- [ ] Success message printed with next steps: "Open in VS Code and call @lom-pm set up the project"
- [ ] Fails gracefully if directory already exists and is non-empty

**Out of Scope**
Git init, npm install — separate slice

---

## [slice-005] — Git init + initial commit
**Epic:** E1 | **Size:** XS | **Depends on:** slice-004

**User Story**
As a developer, I want the scaffolded project to be a git repo from the start so I can track changes immediately.

**Acceptance Criteria**
- [ ] `git init` run in output directory
- [ ] `.gitignore` written (node_modules, .env.local, .next, dist)
- [ ] Initial commit made: `chore(scaffold): initialize project [bootstrap]`

**Out of Scope**
GitHub remote — that's an integration slice

---
