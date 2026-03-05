# Meto

> Lovable gives you an app. Meto gives you a project -- built the right way, your way.

Meto scaffolds structured software projects with built-in methodology. You describe what you want to build, and Meto bootstraps a project with a kanban board, agent definitions, product context, and coding conventions -- ready for your first Claude Code session.

![demo](https://raw.githubusercontent.com/iLomer/Metho_agentic/main/assets/demo.gif)

---

## Quick Start

```bash
npx meto-cli init
```

Answer a few questions about your project, and Meto generates a fully structured repository in seconds.

---

## What Just Happened?

After running `meto-cli init`, your new project comes pre-loaded with everything you need to start building with discipline:

- **CLAUDE.md** -- a project instruction file that Claude Code reads every session, pre-filled with your vision, stack, and conventions
- **Kanban board** -- a task pipeline (backlog, todo, in-progress, testing, done) ready for your first sprint
- **Agent definitions** -- PM, developer, and tester agents configured to follow your methodology from day one
- **Product context** -- your vision, tech stack, and decisions captured in structured files so every session starts with shared context
- **Epics and workflows** -- definition of done, commit conventions, and an epic backlog to plan against
- **Token optimized** -- generated files are optimized for token consumption with Claude Code, so every session gets more productive output per dollar spent

No more hours of manual setup. No more "I forgot to write the CLAUDE.md." It is all there from the start.

---

## What You Get

```
your-project/
├── .claude/
│   ├── agents/
│   │   ├── developer-agent.md
│   │   ├── pm-agent.md
│   │   └── tester-agent.md
│   └── agent-memory/
│       ├── meto-developer/MEMORY.md
│       ├── meto-pm/MEMORY.md
│       └── meto-tester/MEMORY.md
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

---

## Next Steps

1. `cd your-project`
2. Open the project in your editor
3. Start a Claude Code session and call `@meto-pm` to populate your backlog
4. Pick your first task and start building

---

## Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| Node.js | >= 18 | Required to run the CLI |
| git | any | Recommended -- Meto will initialize a repository if git is available |
| Claude Code | latest | For the generated project to work with agents |

---

## CLI Reference

| Command | Description |
|---|---|
| `meto-cli init` | Scaffold a new structured project |
| `meto-cli init --dry-run` | Preview the generated file tree without writing to disk |
| `meto-cli --help` | Show available commands and options |
| `meto-cli --version` | Show the installed version |

---

## License

MIT
