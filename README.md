# Lom — Methodology Agentic AI

> "Lovable gives you an app. Lom gives you a project — built the right way, your way."

---

## What This Repo Is

This is the Lom product itself — a Tauri desktop app + Node.js CLI that scaffolds structured software projects.

**Two components, one shared template core:**
- `src/` — the Lom app and CLI source code
- `templates/` — the scaffold that Lom generates for users' projects

---

## Project Structure

```
/
├── CLAUDE.md                              ← Read every session
├── .claude/
│   ├── agents/
│   │   ├── pm-agent.md                    ← @lom-pm
│   │   ├── developer-agent.md             ← @lom-developer
│   │   └── tester-agent.md                ← @lom-tester
│   └── agent-memory/
│       ├── lom-pm/MEMORY.md
│       ├── lom-developer/MEMORY.md
│       └── lom-tester/MEMORY.md
├── ai/
│   ├── context/
│   │   ├── product-vision.md              ← What Lom is
│   │   ├── tech-stack.md                  ← Tauri, Next.js, Node.js CLI
│   │   ├── decisions.md                   ← D001–D006 and growing
│   │   └── test-log.md
│   ├── backlog/
│   │   └── epics.md                       ← 8 epics defined
│   ├── tasks/
│   │   ├── tasks-backlog.md               ← slice-001 to slice-005 defined
│   │   ├── tasks-todo.md                  ← slice-001 ready to build
│   │   ├── tasks-in-progress.md
│   │   ├── tasks-in-testing.md
│   │   └── tasks-done.md
│   └── workflows/
│       ├── definition-of-done.md
│       └── commit-conventions.md
├── src/                                   ← Lom app source (CLI + Tauri)
└── templates/                             ← What Lom generates for users
    ├── CLAUDE.md                          ← Token-based template
    ├── .claude/agents/                    ← Agent templates
    ├── .claude/agent-memory/              ← Memory templates
    └── ai/                                ← Full methodology scaffold
```

---

## Getting Started

Board is ready. First task is in `tasks-todo.md`.

```
@lom-developer
```

That's it.
