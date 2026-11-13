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

**Already have a project?** The audit installs Meto into it, one layer at a time, without overwriting anything you have:

```bash
cd your-existing-project
npx meto-cli audit
```

**Scaffolded with an older Meto?** Bring its agents, `CLAUDE.md` sections, hooks and mod up to the current version:

```bash
npx meto-cli audit --upgrade
```

---

## How It Works

Meto detects whether Claude Code is installed on your machine and offers two paths:

**With Claude Code (AI-powered):**
1. You answer 5 questions -- project name, description, target users, tech stack, output directory
2. Choose your workflow mode -- **Sprint** (sequential) or **Swarm** (parallel epic agents)
3. Select any MCP integrations to pre-configure for your project (GitHub, Sentry, PostgreSQL, Context7)
4. Claude Code generates your product vision, problem statement, epics, and a sliced backlog with acceptance criteria
5. Meto renders everything -- `.claude/settings.json` pre-configured with your stack's permission allowlist, `.mcp.json` generated if you selected integrations
6. ccstatusline setup runs so your terminal shows session state

**Without Claude Code (static):**
1. You answer 10 questions -- the 5 above plus problem statement, success criteria, value proposition, out of scope, and code conventions
2. Choose your workflow mode -- Sprint or Swarm
3. Select any MCP integrations to pre-configure for your project (GitHub, Sentry, PostgreSQL, Context7)
4. Meto renders your answers into the same structured project -- `.claude/settings.json` pre-configured with your stack's permission allowlist, `.mcp.json` generated if you selected integrations

Both paths produce the same project structure. The AI path just fills in more content so you spend less time on setup and more time building.

Use `--no-ai` to force the static path even when Claude Code is available.

---

## Claude Tooling Setup

Every scaffold (and every `meto-cli audit` install) sets up Claude Code features in the project itself, in `.claude/settings.json` and the agent definitions:

| Feature | What it does |
|---|---|
| **Handoff on session start** | A `SessionStart` hook prints `ai/handoff/current.md` into every new session, so nobody has to remember to read it |
| **Compaction focus** | A `PreCompact` hook tells the summary to keep the active slice, unmet criteria and uncommitted files |
| **Project memory** | Every agent has `memory: project`, so Claude Code loads its `.claude/agent-memory/<agent>/MEMORY.md` by itself |
| **Permission allowlist** | The commands your stack needs, in sprint and swarm mode alike |
| **Stack rules** | `.claude/rules/stack.md` is scoped to your stack's file types, so Claude Code loads the rules when an agent reads or edits a matching file |
| **Model routing** | Each slice can name a model; the mod launches the building agent on it |
| **Skills** | `meto-rubric` for the tester and, in swarm mode, `meto-swarm-guide` -- procedures that load when needed instead of sitting in every prompt |
| **`/meto-swarm` workflow** (swarm mode) | A script decides which epic agents run together, launches them, then the tester |
| **Context7 MCP** (optional) | Up-to-date library documentation, written to the project's `.mcp.json` when you select it |
| **ccstatusline** | A status line for your Claude Code terminal; the setup is interactive during `meto init` |

`meto init` no longer writes to `~/.claude/settings.json`: Claude Code does not read MCP servers from that file, so the old Context7 and Sequential Thinking entries there never loaded and can be deleted.

---

## Project MCP Integrations

During `meto init`, you can pre-configure MCP servers scoped to your project. They go into a `.mcp.json` at your project root, so they activate only when Claude Code is opened inside that project.

| Integration | MCP server | Env var required |
|---|---|---|
| **GitHub** | `@modelcontextprotocol/server-github` | `GITHUB_TOKEN` |
| **Sentry** | `@modelcontextprotocol/server-sentry` | `SENTRY_AUTH_TOKEN`, `SENTRY_ORG` |
| **PostgreSQL** | `@modelcontextprotocol/server-postgres` | `DATABASE_URL` |
| **Context7** | `@upstash/context7-mcp` | none |

Select one, many, or none -- you can always add more later by editing `.mcp.json` directly. Meto prints the required env var names at the end of `init` so you know exactly what to set.

---

## Stack-Aware Permissions

Every scaffolded project gets a `.claude/settings.json` pre-configured with a permission allowlist for the chosen tech stack. This means your agents can run `npm test`, `pytest`, `go build`, etc. without Claude Code prompting for approval on every command.

| Stack | Pre-allowed commands |
|---|---|
| **Next.js / Vite / Node.js / React Native** | `npm run *`, `npx *`, `node *`, `npx tsc *`, `npx vitest *` |
| **Python (FastAPI)** | `pytest *`, `pip *`, `python *`, `uv *`, `uvicorn *`, `alembic *` |
| **Go** | `go test *`, `go build *`, `go run *`, `go fmt *`, `golangci-lint *` |
| **Flutter** | `flutter test`, `flutter pub *`, `flutter build *`, `dart *`, `fvm *` |

All stacks also include universal allows: `Read`, `Edit`, `Write`, `Glob`, `Grep`, and common shell commands (`git *`, `ls *`, `mkdir *`, etc.).

Run `/fewer-permission-prompts` inside Claude Code anytime to extend the allowlist based on what your agents actually use.

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
| **Layer 3** | Governance: commit conventions, definition of done, code guidelines, project memory, agent cross-references |

Each missing item offers a fix — create the file from Meto's templates, never overwriting existing content. Run it repeatedly to ratchet your project up one layer at a time.

### Upgrading an older scaffold

The audit never overwrites a file, so a project scaffolded by an older Meto keeps its old agent definitions. `meto-cli audit --upgrade` lists what it would change, then asks:

| What | How it is upgraded |
|---|---|
| Agent definitions, the rubric template, the meto mod | Replaced by the current templates. Epic agents keep their epic id, name and domain |
| Skills, the `/meto-swarm` workflow (swarm projects), `.claude/rules/stack.md` (known stacks) | Added when missing; skills and workflow are replaced when outdated. Existing stack rules are left alone |
| `CLAUDE.md` | Meto's sections are re-rendered; your project name, vision, stack and code conventions are kept. Other edits you made to the file are not, so commit first |
| `.claude/settings.json` | The session-start and compaction hooks are added. Your permissions, env and own hooks are kept |
| Agent `MEMORY.md` files | Only the old checklist boilerplate is removed; what the agents wrote stays |
| `session-checkpoint.md`, `ai/handoff/README.md`, `ai/rubric/README.md`, `swarm-workflow.md` | Removed -- replaced by the hooks and skills |

The board, context files, definition of done, code guidelines and a filled-in handoff are never touched. Running it again when everything is current changes nothing.

The audit also **auto-detects your tech stack** from `package.json`, `go.mod`, `pyproject.toml`, `pubspec.yaml`, or `Cargo.toml` to provide stack-specific templates.

---

## Code Guidelines

Every scaffolded project includes `ai/workflows/code-guidelines.md`:

| Rule | Limit |
|---|---|
| Max file length | 300 lines |
| Max function length | 50 lines |
| Circular imports | Not allowed |
| Debug output, commented-out code, hardcoded secrets | Not in commits |

Stack-specific rules (e.g., "never call Supabase directly from components" for Next.js, "always check error returns" for Go) live in `.claude/rules/stack.md` with a `paths:` scope such as `**/*.py`. Claude Code loads them into whichever agent reads or edits a matching file, so they arrive when they apply and cost nothing otherwise. The developer agent follows the guidelines and pastes the check output into the task; the tester runs the project's lint, typecheck and test commands instead of re-checking by hand.

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
│   ├── rules/stack.md            # stack rules, loaded for matching files
│   ├── skills/
│   │   ├── meto/                 # meto mod: board pane, guards, slice IDs, model routing
│   │   └── meto-rubric/SKILL.md  # how the tester scores a slice
│   └── settings.json             # hooks + stack-aware permission allowlist
├── ai/
│   ├── backlog/
│   │   └── epics.md
│   ├── context/
│   │   ├── decisions.md
│   │   ├── product-vision.md
│   │   └── tech-stack.md
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
│       └── definition-of-done.md
├── src/
├── .gitignore
├── .mcp.json                     # optional — generated if MCP integrations were selected
└── CLAUDE.md
```

**Swarm mode adds:**
```
├── .claude/
│   ├── agents/
│   │   ├── epic-agent-E1.md      # one per epic
│   │   ├── epic-agent-E2.md
│   │   └── ...
│   ├── agent-memory/
│   │   ├── meto-epic-E1/MEMORY.md # one per epic
│   │   └── ...
│   ├── skills/meto-swarm-guide/SKILL.md  # setting up and running a swarm
│   └── workflows/meto-swarm.js   # the /meto-swarm workflow
├── ai/
│   └── swarm/
│       ├── SWARM_AWARENESS.md     # live swarm state
│       └── domain-map.md          # file ownership per epic
```

**What's inside:**
- **CLAUDE.md** -- project instructions that Claude Code reads every session, pre-filled with your vision, stack, and conventions
- **Kanban board** -- task pipeline (backlog, todo, in-progress, testing, done) ready for your first sprint
- **4 agent definitions** -- PM, developer, tester, and community manager agents configured to follow your methodology from day one
- **Agent memory** -- persistent memory files so agents retain context across sessions
- **meto mod** -- `.claude/skills/meto/`, a Claude Code plugin loaded automatically: board pane (`/meto-board`), clash-free slice IDs (`/meto-slice`), guards against overlapping epic agents, out-of-domain edits and duplicate agent reports, plus swarm status, session info and a handoff reminder in the board pane — nothing added around the prompt. `meto-cli audit` installs it into existing projects
- **Stack-aware permissions** -- `.claude/settings.json` pre-configured with the right permission allowlist for your tech stack
- **Project MCP integrations** -- optional `.mcp.json` with GitHub, Sentry, or PostgreSQL servers ready to activate
- **Product context** -- vision, tech stack, and decisions captured in structured files
- **Code guidelines** -- file size limits, naming conventions, and stack-specific rules enforced by agents
- **Epics and workflows** -- definition of done, commit conventions, code guidelines, and an epic backlog to plan against
- **Agent Teams ready** -- four agents configured to work in parallel with file ownership boundaries
- **Swarm mode** -- parallel epic agents with domain ownership, checkpoint rhythm, and a live status dashboard

---

## Agents

Every scaffolded project comes with 4 pre-configured agents:

| Agent | Role | Can write code? |
|---|---|---|
| `@meto-pm` | Planning, backlog management, epic definition, task slicing | No -- planning files only |
| `@meto-developer` | Code implementation -- picks tasks from todo, builds, tests | Yes |
| `@meto-tester` | Validates completed work against acceptance criteria; scores it with the `meto-rubric` skill and runs `code-review` on L slices | No -- board and score files only |
| `@meto-community` | Community engagement, user communication, market awareness | No -- drafts in `ai/community/` only |

The **community manager** understands the product and its market. It reads product context files, drafts Reddit posts, changelog summaries, and feature announcements, and surfaces user feedback themes back to `@meto-pm`. It never writes code or posts anything itself: everything is a draft in `ai/community/` for you to review. The meto mod enforces the "No" column for all three agents.

In **swarm mode**, additional `@meto-epic-[id]` agents are generated -- one per epic, each scoped to its own file domain.

---

## Mods

Every project ships with the **meto mod** in `.claude/skills/meto/` -- a Claude Code plugin that loads automatically in any session started in the project. It turns the methodology's rules into guards the agents can't skip, and puts the board one command away. It switches itself off in folders without `ai/tasks/`.

**Commands**

| Command | What it does |
|---|---|
| `/meto-board` | Opens the board in a side pane: session (model, context used, cost, git user, branch and changes, tokens), column counts, swarm status, in progress, testing, next up, and a handoff reminder when one is due |
| `/meto-slice [count] [prefix]` | Reserves the next free slice IDs, checked against the local board and `origin`, e.g. `/meto-slice 2 Lom_Slice` → `Lom_Slice-0044, Lom_Slice-0045` |

**Guards** -- each refuses the tool call and tells the agent why:

| Guard | Refuses |
|---|---|
| Overlap | An epic agent whose epic is already running, whose files overlap a running epic's in `ai/swarm/domain-map.md`, or whose next slice needs work still in progress. No fixed agent cap -- independent epics all run |
| Domain | An epic agent's Edit/Write outside the paths its epic owns or shares (the board, handoff and its own memory are always allowed) |
| Model routing | Not a refusal: a `@meto-developer` or epic agent launch with no model named is started on the model its next slice asks for |
| Role | A PM, tester or community agent's Edit/Write outside its own files -- they plan, validate and draft, and never touch source code |
| One report | A meto agent's `SendMessage` -- its final answer is its report, so nothing reaches the lead twice |

**Settings** (`/config` → meto):

| Setting | Default | What it does |
|---|---|---|
| `idPrefix` | `slice` | Prefix for `/meto-slice`. Give each person their own (`Lom_Slice`) so two people never take the same ID |
| `swarmBand` | off | Adds a one-line swarm status row above the prompt |

The mod adds nothing around the prompt by default. Existing projects get it with `npx meto-cli audit` (Layer 2), which never overwrites files you have; `npx meto-cli audit --upgrade` replaces an older copy of the mod with the current one. To turn it off, delete `.claude/skills/meto/`.

> Domain-map tip: an epic can't own a folder that contains another epic's file -- list files instead, or the overlap guard will keep those two epics from running together.

---

## Workflow Modes

### Sprint (default)

One task at a time, sequential. The developer agent picks from the top of the todo list, implements, tests, done. Simple and controlled.

Tasks can declare optional `needs` dependencies in their definition (e.g. `**Needs:** slice-010, slice-011`). Run `meto-cli ready` to surface only the tasks whose dependencies are fully satisfied — no more manually reasoning about ordering in a long backlog.

### Swarm

Multiple epic agents run in parallel, each scoped to its own domain (files/directories). Every 3 tasks, agents write a checkpoint to `SWARM_AWARENESS.md`. You stay in control with:

```bash
npx meto-cli status
```

This reads `SWARM_AWARENESS.md` and prints a formatted dashboard -- epic progress, tasks done, blockers, and acceptance criteria at a glance.

**How swarm works:**
1. `@meto-pm` slices epics and assigns domains in `domain-map.md`
2. Each epic gets its own agent (`@meto-epic-E1`, `@meto-epic-E2`, etc.)
3. Run `/meto-swarm` in Claude Code. The workflow script reads the state with `meto-cli status --json` and decides in code, from the domain map, which epics share no files and can run together
4. It launches those epic agents in parallel, each on the model its slices ask for
5. When an epic's todo is empty it becomes `testing-ready`, and the workflow runs `@meto-tester` on it -- one epic at a time (M/L tasks; XS/S are self-validated)
6. Failed slices go back to todo and are picked up on the next round, until every epic is `complete` or nothing more can run
7. The result lists what was built and tested, which epics were held back and why, and any file an agent changed outside its domain

Ask for a dry run (`{ "dryRun": true }`) to see the plan without launching anything; `{ "epics": ["E1"] }` limits the run and `{ "maxRounds": 3 }` caps the rounds. Workflows need a paid Claude plan; without them, launch `@meto-epic-[id]` and `@meto-tester` by hand as the `meto-swarm-guide` skill describes, and the mod's overlap guard refuses a launch that collides.

The mod's guards apply to agents the main session launches. Agents started by a workflow are outside them, which is why the workflow does its own overlap check and reports out-of-domain files.

Best for projects with multiple independent epics where parallelism speeds things up.

---

## Model Routing

Not every slice needs the same model. A task block can carry a `Model` line, and `CLAUDE.md` has a routing table `@meto-pm` follows when slicing:

| Work | Model |
|---|---|
| Database schema, migrations, auth, access rules, payments | `opus` |
| Feature code | `sonnet` |
| Copy, labels, config values, docs | `haiku` |

The table is yours to edit (`fable` is accepted too). The mod reads the board when the developer or an epic agent is launched and starts it on that model: the developer gets the model of the top slice it can start, an epic agent the most capable model its epic's slices ask for. A slice without the line runs on the agent's default, `sonnet`. The `/meto-swarm` workflow applies the same rule.

---

## Context & Sessions

Meto leaves context management to Claude Code, which compacts long sessions on its own, and makes sure the project state survives it:

- **Handoff:** a `SessionStart` hook loads `ai/handoff/current.md` into every new session
- **Compaction:** a `PreCompact` hook tells the summary to keep the active slice, unmet criteria and uncommitted files
- **Memory:** each agent's `MEMORY.md` persists across sessions and is loaded for it

Each agent has a memory file in `.claude/agent-memory/` that Claude Code loads into it automatically (`memory: project`) and that the agent keeps current. Every session ends with the main session writing `ai/handoff/current.md` once (subagents report in their final reply) — a short snapshot of the active slice, what was finished, blockers, and the single next action. Git history preserves the full audit trail of handoffs.

**Board compaction:** On long-running projects, `tasks-done.md` accumulates closed task definitions and starts adding noise to agent context. Run `meto-cli compact` to replace each closed task with a 2–3 sentence Claude Haiku summary — same information, a fraction of the tokens. Use `--dry-run` to preview before writing, and `--min-tasks=N` to skip compaction on short projects (default threshold: 20 tasks).

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
5. **Swarm:** run `/meto-swarm` to launch the epic agents and the tester, and `npx meto-cli status` to monitor
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
| `meto-cli audit` | Install Meto into an existing project: scan it against the methodology blueprint and fix gaps interactively |
| `meto-cli audit --upgrade` | Bring Meto's own files in a project up to the installed version (add `--yes` to skip the prompts) |
| `meto-cli audit --rubric` | Check the last 5 completed slices for rubric scores and passing tests |
| `meto-cli doctor` | Check methodology health of the current project |
| `meto-cli status` | Show swarm progress dashboard (reads SWARM_AWARENESS.md) |
| `meto-cli status --json` | Print the swarm state as JSON: per epic its status, owned paths, slice counts, open dependencies and model |
| `meto-cli compact` | Summarise closed tasks in `tasks-done.md` using Claude Haiku to shrink agent context load |
| `meto-cli compact --dry-run` | Preview which tasks would be compacted without writing to disk or calling the API |
| `meto-cli compact --min-tasks=N` | Skip compaction when `tasks-done.md` has fewer than N tasks (default: 20) |
| `meto-cli ready` | List tasks in `tasks-todo.md` whose `needs` dependencies are all satisfied — safe to start now |
| `meto-cli --help` | Show available commands and options |
| `meto-cli --version` | Show the installed version |

---

## License

MIT
