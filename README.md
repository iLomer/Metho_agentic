# Meto

> Lovable gives you an app. Meto gives you a project -- built the right way, your way.

Meto scaffolds structured software projects with built-in methodology. You describe what you want to build, and Meto bootstraps a project with AI-generated epics, a sliced backlog, agent definitions, product context, and coding conventions -- ready for your first Claude Code session.

![demo](https://raw.githubusercontent.com/iLomer/Metho_agentic/main/assets/demo.gif)

---

## Quick Start

```bash
npx meto-cli init
```

Answer a few questions, and Meto generates a fully structured repository in seconds -- with AI-powered content if Claude Code is installed.

---

## How It Works

Meto detects whether Claude Code is installed on your machine and offers two paths:

**With Claude Code (AI-powered):**
1. You answer 5 questions -- project name, description, target users, tech stack, output directory
2. Claude Code generates your product vision, problem statement, epics, and a sliced backlog with acceptance criteria
3. Meto renders everything into a structured project ready for your first sprint

**Without Claude Code (static):**
1. You answer 10 questions -- the 5 above plus problem statement, success criteria, value proposition, out of scope, and code conventions
2. Meto renders your answers into the same structured project with sensible defaults

Both paths produce the same project structure. The AI path just fills in more content so you spend less time on setup and more time building.

Use `--no-ai` to force the static path even when Claude Code is available.

---

## Stack Presets

Choose from 7 built-in tech stacks, each with a tailored description, definition of done, and starter epics:

| Stack | What you get |
|---|---|
| **Next.js + Supabase** | Full-stack web app with auth, database, and edge functions |
| **React Native** | Cross-platform mobile app |
| **Node.js CLI** | Command-line tool distributed via npm |
| **Python (FastAPI)** | REST API with async support, auto-generated docs |
| **Go** | Compiled backend service or CLI tool |
| **Vite + React** | Client-side SPA with fast dev server |
| **Flutter** | Cross-platform mobile and web app with Dart |
| **Custom** | Describe your own stack |

Each preset populates your tech-stack description, definition of done (with stack-specific checks), and starter epics so your backlog has real structure from day one.

---

## What You Get

```
your-project/
├── .claude/
│   ├── agents/
│   │   ├── developer-agent.md
│   │   ├── pm-agent.md
│   │   └── tester-agent.md
│   ├── agent-memory/
│   │   ├── meto-developer/MEMORY.md
│   │   ├── meto-pm/MEMORY.md
│   │   └── meto-tester/MEMORY.md
│   └── settings.json
├── ai/
│   ├── backlog/
│   │   └── epics.md
│   ├── context/
│   │   ├── decisions.md
│   │   ├── product-vision.md
│   │   ├── tech-stack.md
│   │   └── test-log.md
│   ├── tasks/
│   │   ├── tasks-backlog.md
│   │   ├── tasks-done.md
│   │   ├── tasks-in-progress.md
│   │   ├── tasks-in-testing.md
│   │   └── tasks-todo.md
│   └── workflows/
│       ├── commit-conventions.md
│       └── definition-of-done.md
├── src/
├── .gitignore
└── CLAUDE.md
```

**What's inside:**
- **CLAUDE.md** -- project instructions that Claude Code reads every session, pre-filled with your vision, stack, and conventions
- **Kanban board** -- task pipeline (backlog, todo, in-progress, testing, done) ready for your first sprint
- **Agent definitions** -- PM, developer, and tester agents configured to follow your methodology from day one
- **Agent memory** -- persistent memory files so agents retain context across sessions
- **Product context** -- vision, tech stack, and decisions captured in structured files
- **Epics and workflows** -- definition of done, commit conventions, and an epic backlog to plan against
- **Agent Teams ready** -- three agents configured to work in parallel with file ownership boundaries

---

## Agent Teams

Agent Teams is a Claude Code feature where multiple AI agents work in parallel on the same codebase, each with a specialized role.

Meto scaffolds projects ready for Agent Teams out of the box:

- **Three pre-configured agents** -- PM for planning, developer for building, tester for validation
- **File ownership boundaries** -- each agent writes only to its designated files, preventing conflicts when running in parallel
- **Feature enabled automatically** -- `.claude/settings.json` sets the experimental flag so Agent Teams works immediately

**To activate:** start `claude` in your project, then say:

> "Create an agent team with @meto-pm for planning, @meto-developer for building, @meto-tester for validation"

---

## Next Steps

1. `cd your-project`
2. Open the project in your editor
3. Start a Claude Code session and call `@meto-pm` to populate your backlog
4. Or spawn an agent team: tell Claude to create a team with @meto-pm, @meto-developer, and @meto-tester
5. Pick your first task and start building

---

## Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| Node.js | >= 18 | Required to run the CLI |
| git | any | Recommended -- Meto initializes a repository if git is available |
| Claude Code | latest | Optional -- enables AI-powered generation. Without it, Meto uses static prompts |

---

## CLI Reference

| Command | Description |
|---|---|
| `meto-cli init` | Scaffold a new structured project (AI-powered if Claude Code is detected) |
| `meto-cli init --no-ai` | Scaffold using static prompts only, skip AI generation |
| `meto-cli init --dry-run` | Preview the generated file tree without writing to disk |
| `meto-cli --help` | Show available commands and options |
| `meto-cli --version` | Show the installed version |

---

## License

MIT
