# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [0.25.0] - 2026-11-26

### Added

- `meto-cli repair`: checks a project's meto files and repairs them. It includes what `audit --upgrade` did (now an alias) and adds swarm repairs: an agent and a `SWARM_AWARENESS.md` row for every epic in `epics.md`, a `complete` epic with open slices set back to `on-track`, agent domains taken from `domain-map.md`, missing board columns. `--check` writes nothing and exits 1 when something needs repair; `--swarm` does only the swarm part
- `/meto-swarm <request>`: `@meto-pm` slices the request into the board and assigns each slice to an epic before the agents build
- `/meto-swarm` serial lane: slices with `Epic: none`, or an epic outside the swarm table, are built by `@meto-developer` after the epic agents and tested separately
- `meto-cli status --json` lists those slices under `unowned`
- meto mod 0.5.0: in a swarm project it refuses a main-session edit inside an epic's domain; the `leadEdits` option relaxes this to `warn` or `allow`

### Changed

- `/meto-swarm` runs `meto-cli repair --swarm` before every round, so the swarm keeps working after the first backlog: new epics and new slices for finished epics are picked up without manual setup. With an older meto-cli that has no `repair`, the round says so and continues
- `meto-cli status` prints one line when `repair` has something to fix; `doctor` points to `repair` when checks fail
- Epic headings in `epics.md` may use a dash or a colon (`## E1 — Name`, `## E1: Name`) besides `--`
- `@meto-pm` instructions and the Swarm Mode section of `CLAUDE.md` describe the request-first flow

## [0.24.0] - 2026-11-14

### Added

- `/meto-swarm` workflow (`.claude/workflows/meto-swarm.js`, swarm mode): a script reads the swarm state, launches the epic agents that share no files, runs the tester per epic, and repeats; supports a dry run, an epic filter and a round limit
- `meto-cli status --json`: the swarm state as JSON, read by the workflow
- Model routing: an optional `Model` line per slice, a routing table in `CLAUDE.md`, and the mod (0.4.0) launches the developer or epic agent on that model
- `.claude/rules/stack.md`: stack rules scoped with `paths:`, loaded when an agent touches a matching file
- Skills: `meto-rubric` (tester scoring, with `code-review` on L slices) and `meto-swarm-guide` (swarm mode)
- `audit --upgrade` adds the skills, the workflow and the stack rules to existing projects; `audit` checks for the rubric skill and offers the stack rules

### Changed

- Developer, tester, epic and community agents default to `model: sonnet`; tester and PM can invoke skills
- `code-guidelines.md` points at the stack rules instead of repeating them

### Fixed

- `meto-cli status` now recognises the `testing-ready` epic status instead of showing it as `not-started`

### Removed

- `ai/workflows/swarm-workflow.md` and `ai/rubric/README.md`, replaced by the two skills

## [0.23.0] - 2026-11-13

### Added

- `meto-cli audit --upgrade`: brings an older scaffold's agents, `CLAUDE.md` sections, hooks, rubric and mod up to the current templates while keeping the project's own content (`--yes` skips the prompts)
- meto mod 0.3.0: role guard refuses a PM, tester or community agent's edit outside its own files

### Changed

- Templates rewritten for current Claude Code: about half the words, no context-budget rules, no repeated session checklists, no `NEVER DO` blocks
- Agents use `memory: project` (was the invalid `memory: false`), so Claude Code loads each agent's `MEMORY.md` by itself
- `.claude/settings.json` keeps its hooks in both modes and swarm mode now gets the permission allowlist
- `SessionStart` hook loads `ai/handoff/current.md` into new sessions; `PreCompact` hook steers the compaction summary
- Tester and community agents can write their own files (score files, board, drafts)
- Checks point at the stack's definition of done instead of hardcoded TypeScript commands
- `meto-cli audit` checks agents for `memory: project` and fixes older scaffolds in place
- `meto-cli compact` uses `claude-haiku-5-5`
- Context7 is an optional project MCP integration in `.mcp.json`

### Removed

- Writing MCP servers to `~/.claude/settings.json` (Claude Code never loaded them from there) and the Sequential Thinking MCP
- `ai/workflows/session-checkpoint.md`, `ai/handoff/README.md`, `ai/context/test-log.md`, and the audit check for the session checkpoint
- The undocumented `agents` key in swarm settings

## [0.7.0] - 2026-03-05

### Added

- Doctor command (`meto-cli doctor`) that checks methodology health of a Meto-scaffolded project
- 7 health checks: required files, context content, board format, epics content, agent definitions, WIP limit, orphan tasks
- Project root detection by walking up from current directory looking for `ai/tasks/`
- Scannable report with pass/warn/fail per check and summary line
- Exit code 1 when any check fails (0 for pass or warnings only)

## [0.6.0] - 2026-03-05

### Added

- 4 new stack presets: Python (FastAPI), Go, Vite + React, Flutter
- Each preset includes tailored tech-stack description, definition of done, and starter epics

## [0.4.0] - 2026-03-05

### Added

- AI-powered init: when Claude Code is detected, generates product vision, epics, and sliced backlog automatically
- User answers 5 questions instead of 10 when AI is available
- `--no-ai` flag to force static prompts even when Claude Code is installed
- AI generation with 90-second timeout and progress spinner
- Fallback to static prompts when AI generation fails (timeout, parse error, subprocess crash)
- Section-delimited AI output parsing with validation
- AI generation summary note showing what was generated
- Agent memory files scaffolded for PM, developer, and tester agents
- Agent Teams support with `.claude/settings.json` and file ownership boundaries

## [0.1.0] - 2026-03-04

### Added

- CLI scaffold command (`meto-cli init`) that bootstraps a structured project with methodology built in
- 10 interactive prompts collecting project brief (name, description, target users, tech stack, problem statement, success criteria, value proposition, out of scope, code conventions, output directory)
- 3 stack presets: Next.js + Supabase, React Native, Node.js CLI
- Custom stack option with free-text input
- Stack-aware Definition of Done generated per project
- Dry-run mode (`meto-cli init --dry-run`) to preview scaffold output without writing files
- Pre-flight checks: Node.js version validation (>= 18), git availability detection, write permission verification
- Git repository initialization with initial commit after scaffold
- SIGINT cleanup handler that removes partial scaffold on interruption
- Post-scaffold next steps guidance with conditional git init reminder
- Template rendering engine with token replacement (`{{TOKEN}}` format)
- File tree visualization for dry-run output
- `--help` and `--version` flags
