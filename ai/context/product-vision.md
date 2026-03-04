# Product Vision — Lom

## What We Are Building
A native desktop app (Tauri) and CLI that scaffolds structured software projects following an agile methodology. You describe what you want to build, select your stack, and click Run. Lom bootstraps the project, populates the backlog, wires up integrations, and enforces PM → epics → slices → build → test from day one.

## The Problem We Solve
Starting a new project always involves the same manual overhead: folder structures, agent role definitions, CLAUDE.md, Supabase setup, GitHub repo, Vercel connection. Hours of setup before any real work begins.

Most AI builders skip straight to generation — no planning layer, no backlog, no slice discipline. They're great for demos, messy for real projects. When things break, there's no structure to fall back on.

The methodology lives in your head and in static starter kit files. Lom makes it automatic, repeatable, and enforced from day one.

## Target Users
**Primary:** Developers and technical founders who use Claude Code and want methodology enforced from day one — not retrofitted after chaos.
**Secondary (v2):** Non-technical builders who want to launch a product without touching a terminal.

## Core Value Proposition
"Lovable gives you an app. Lom gives you a project — built the right way, your way."

## What Makes This Different

| | Lovable / Bolt | Cursor / Copilot | Lom |
|---|---|---|---|
| Approach | Generation-first | Assistant-first | Methodology-first |
| Output | App | Code suggestions | Structured project |
| Planning | None | None | PM agent + backlog |
| Task management | None | None | Agile/Kanban built-in |
| Runs on | Their cloud | IDE plugin | Your machine |
| Auth | Their account | Their account | Your Claude subscription |

## Success Criteria
- New project: brief → running repo in under 10 minutes
- Zero terminal commands required from the user
- Kanban board populated before first Claude Code session
- CLAUDE.md accurately reflects vision and methodology
- Backlog has minimum 3 epics and first sprint sliced on day one
- App feels native — not a website in a box

## Output Modes
- **Scaffold** — structured repo, populated kanban board, agents ready for Claude Code sessions
- **Full MVP** — deployed app, live integrations, first sprint completed

## Out of Scope (v1)
- Web-hosted version
- Multi-user or team features
- Billing or subscription management
- Non-Claude AI providers
- Linux
- Mobile
