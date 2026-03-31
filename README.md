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

**Already have a project?** Run the audit to bring it up to standard:

```bash
cd your-existing-project
npx meto-cli audit
```

---

## How It Works

Meto detects whether Claude Code is installed on your machine and offers two paths:

**With Claude Code (AI-powered):**
1. You answer 5 questions -- project name, description, target users, tech stack, output directory
2. Choose your workflow mode -- **Sprint** (sequential) or **Swarm** (parallel epic agents)
3. Claude Code generates your product vision, problem statement, epics, and a sliced backlog with acceptance criteria
4. Meto renders everything into a structured project ready for your first sprint or swarm
5. Context7, Sequential Thinking MCP, and ccstatusline are installed into your Claude Code environment automatically

**Without Claude Code (static):**
1. You answer 10 questions -- the 5 above plus problem statement, success criteria, value proposition, out of scope, and code conventions
2. Choose your workflow mode -- Sprint or Swarm
3. Meto renders your answers into the same structured project with sensible defaults

Both paths produce the same project structure. The AI path just fills in more content so you spend less time on setup and more time building.

Use `--no-ai` to force the static path even when Claude Code is available.

---

## Claude Tooling Setup

`meto init` automatically configures your Claude Code environment so your agents are better equipped from day one. No manual setup required.

**What gets installed into `~/.claude/settings.json`:**

| Tool | What it does |
|---|---|
| **Context7 MCP** | Injects up-to-date library documentation into agent context — reduces hallucinated APIs and outdated patterns |
| **Sequential Thinking MCP** | Gives agents a structured reasoning chain for complex, multi-step problems |
| **ccstatusline** | Adds a status line to your Claude Code terminal showing session state at a glance |

Context7 and Sequential Thinking are registered as MCP servers and activate automatically in every Claude Code session. The ccstatusline setup is interactive — you'll configure it in your terminal during `meto init`.

All three are installed with a deep merge: your existing `~/.claude/settings.json` is never overwritten, only extended.

---

## Audit — For Existing Projects

Already built a project before Meto? Run `meto-cli audit` to scan it against the methodology blueprint and fix what's missing — interactively, one layer at a time.

```bash
cd your-existing-project
npx meto-cli audit
```

The audit checks 4 layers, each gating the next:

```
Layer 0 — Project Basics         ████████████ 100%
  ✓ git repo  ✓ README  ✓ source code

Layer 1 — Methodology            ██████░░░░░░  50%
  ✓ CLAUDE.md
  ✓ ai/context/product-vision.md
  ✗ ai/tasks/ (no kanban board)
    → Create board files? [y/n]
  ✗ ai/workflows/ (no definition of done)
    → Create definition-of-done.md? [y/n]

Layer 2 — Agents                  not reached
Layer 3 — Governance              not reached
```

| Layer | What it checks |
|---|---|
| **Layer 0** | Git initialized, README exists, source code present |
| **Layer 1** | CLAUDE.md, ai/ context files, kanban board, workflows |
| **Layer 2** | Agent definitions (PM, developer, tester), agent memory, settings |
| **Layer 3** | Governance: commit conventions, definition of done, code guidelines, session checkpoints, agent cross-references |

Each missing item offers a fix — create the file from Meto's templates, never overwriting existing content. Run it repeatedly to ratchet your project up one layer at a time.

The audit also **auto-detects your tech stack** from `package.json`, `go.mod`, `pyproject.toml`, `pubspec.yaml`, or `Cargo.toml` to provide stack-specific templates.

---

## Code Guidelines

Every scaffolded project includes `ai/workflows/code-guidelines.md` — enforced by both the developer and tester agents:

| Rule | Limit |
|---|---|
| Max file length | 300 lines (hard stop at 500) |
| Max function length | 50 lines |
| Max component length | 200 lines (React/Flutter) |
| Nesting depth | 3 levels max |
| Circular imports | Not allowed |

Guidelines include stack-specific rules (e.g., "never call Supabase directly from components" for Next.js, "always check error returns" for Go). The developer agent reads these at session start, and the tester agent verifies them before sign-off.

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

**Sprint mode (default):**
```
your-project/
├── .claude/
│   ├── agents/
│   │   ├── community-manager-agent.md
│   │   ├── developer-agent.md
│   │   ├── pm-agent.md
│   │   └── tester-agent.md
│   ├── agent-memory/
│   │   ├── meto-community/MEMORY.md
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
│   ├── contracts/
│   │   └── slice-NNN-contract.md  # sprint contract per slice
│   ├── handoff/
│   │   └── current.md             # session handoff artifact
│   ├── rubric/
│   │   ├── tester-rubric.md       # grading dimensions + thresholds
│   │   └── tester-calibration-log.md
│   ├── tasks/
│   │   ├── tasks-backlog.md
│   │   ├── tasks-done.md
│   │   ├── tasks-in-progress.md
│   │   ├── tasks-in-testing.md
│   │   └── tasks-todo.md
│   └── workflows/
│       ├── code-guidelines.md
│       ├── commit-conventions.md
│       ├── definition-of-done.md
│       └── session-checkpoint.md
├── src/
├── .gitignore
└── CLAUDE.md
```

**Swarm mode adds:**
```
├── .claude/
│   ├── agents/
│   │   ├── epic-agent-E1.md      # one per epic
│   │   ├── epic-agent-E2.md
│   │   └── ...
│   └── agent-memory/
│       ├── meto-epic-E1/MEMORY.md # one per epic
│       └── ...
├── ai/
│   ├── swarm/
│   │   ├── SWARM_AWARENESS.md     # live swarm state
│   │   └── domain-map.md          # file ownership per epic
│   └── workflows/
│       └── swarm-workflow.md       # swarm rhythm and protocol
```

**What's inside:**
- **CLAUDE.md** -- project instructions that Claude Code reads every session, pre-filled with your vision, stack, and conventions
- **Kanban board** -- task pipeline (backlog, todo, in-progress, testing, done) ready for your first sprint
- **4 agent definitions** -- PM, developer, tester, and community manager agents configured to follow your methodology from day one
- **Agent memory** -- persistent memory files so agents retain context across sessions
- **Product context** -- vision, tech stack, and decisions captured in structured files
- **Code guidelines** -- file size limits, naming conventions, and stack-specific rules enforced by agents
- **Epics and workflows** -- definition of done, commit conventions, session checkpoints, and an epic backlog to plan against
- **Agent Teams ready** -- four agents configured to work in parallel with file ownership boundaries
- **Swarm mode** -- parallel epic agents with domain ownership, checkpoint rhythm, and a live status dashboard

---

## Agents

Every scaffolded project comes with 4 pre-configured agents:

| Agent | Role | Can write code? |
|---|---|---|
| `@meto-pm` | Planning, backlog management, epic definition, task slicing | No |
| `@meto-developer` | Code implementation -- picks tasks from todo, builds, tests | Yes |
| `@meto-tester` | Validates completed work against acceptance criteria | No |
| `@meto-community` | Community engagement, user communication, market awareness | No |

The **community manager** understands the product and its market. It reads product context files, drafts Reddit posts, changelog summaries, and feature announcements, and surfaces user feedback themes back to `@meto-pm`. It never writes code or edits source files -- read-only access to the codebase.

In **swarm mode**, additional `@meto-epic-[id]` agents are generated -- one per epic, each scoped to its own file domain.

---

## Workflow Modes

### Sprint (default)

One task at a time, sequential. The developer agent picks from the top of the todo list, implements, tests, done. Simple and controlled.

### Swarm

Multiple epic agents run in parallel, each scoped to its own domain (files/directories). Every 3 tasks, agents write a checkpoint to `SWARM_AWARENESS.md`. You stay in control with:

```bash
npx meto-cli status
```

This reads `SWARM_AWARENESS.md` and prints a formatted dashboard -- epic progress, tasks done, blockers, and acceptance criteria at a glance.

**How swarm works:**
1. `@meto-pm` slices epics and assigns domains in `domain-map.md`
2. Each epic gets its own agent (`@meto-epic-E1`, `@meto-epic-E2`, etc.)
3. Launch agents in separate Claude Code sessions -- they work in parallel
4. Agents checkpoint every 3 tasks and flag conflicts for shared files
5. Run `npx meto-cli status` anytime to see the swarm state

Best for projects with multiple independent epics where parallelism speeds things up.

---

## Context & Sessions

Meto is optimized for Claude Code's **1M token context window**. With 5x more room than before:

- **10-15 slices per session** before needing a fresh start
- **Agents can hold more files** in context without degrading
- **Less frequent `/compact`** -- use it when responses slow down, not proactively
- **Memory files still matter** -- they persist across sessions, not just within them

Each agent has a memory file in `.claude/agent-memory/` that it reads at session start and updates at session end. Every session also ends by writing `ai/handoff/current.md` — a structured snapshot of sprint state, completed steps, blockers, and the single next action. The next agent reads this before anything else. Git history preserves the full audit trail of handoffs.

---

## Agent Teams

Agent Teams is a Claude Code feature where multiple AI agents work in parallel on the same codebase, each with a specialized role.

Meto scaffolds projects ready for Agent Teams out of the box:

- **Four pre-configured agents** (Sprint) or **per-epic agents** (Swarm) -- all with file ownership boundaries
- **Feature enabled automatically** -- `.claude/settings.json` sets the experimental flag so Agent Teams works immediately

**To activate:** start `claude` in your project, then say:

> Sprint: "Create an agent team with @meto-pm for planning, @meto-developer for building, @meto-tester for validation, and @meto-community for community engagement"

> Swarm: "Launch @meto-epic-E1 to work on Epic 1"

---

## Next Steps

1. `cd your-project`
2. Open the project in your editor
3. Start a Claude Code session and call `@meto-pm` to populate your backlog
4. **Sprint:** spawn an agent team with @meto-pm, @meto-developer, @meto-tester, and @meto-community
5. **Swarm:** launch epic agents in parallel, run `npx meto-cli status` to monitor
6. Pick your first task and start building

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
| `meto-cli audit` | Scan an existing project against the methodology blueprint and fix gaps interactively |
| `meto-cli audit --rubric` | Check the last 5 completed slices for sprint contracts, rubric scores, and passing tests |
| `meto-cli doctor` | Check methodology health of the current project |
| `meto-cli status` | Show swarm progress dashboard (reads SWARM_AWARENESS.md) |
| `meto-cli --help` | Show available commands and options |
| `meto-cli --version` | Show the installed version |

---

## License

MIT
