# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com),
and this project adheres to [Semantic Versioning](https://semver.org/).

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
