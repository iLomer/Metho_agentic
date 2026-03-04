# Tech Stack — Lom

## The App

| Layer | Choice | Reason |
|---|---|---|
| Shell | Tauri (Rust) | Few MB vs Electron's 150MB+, native feel, built-in auto-update |
| UI | Next.js + Tailwind CSS | Same stack as the projects Lom generates |
| Language | TypeScript throughout | Consistency across UI and tooling |
| Local storage | SQLite via Tauri | Project registry, settings, session state |
| AI | Claude Code as CLI subprocess | Uses user's existing subscription, no API cost to Lom |

## CLI Component

| Layer | Choice |
|---|---|
| Runtime | Node.js |
| Language | TypeScript |
| Prompts | clack (`@clack/prompts`) |
| Distribution | npm (`npx lom init`) |

## Integrations (all OAuth)
- **GitHub** — repo creation, branch setup, initial commit
- **Vercel** — project creation, repo linking, auto-deploy config
- **Supabase** — project provisioning, env vars injection

## Platforms
- macOS (.dmg)
- Windows (.exe)
- Linux — v2

## Environment Variables
```
# Set by user during first-time setup — stored in SQLite, never in .env
GITHUB_TOKEN=
VERCEL_TOKEN=
SUPABASE_TOKEN=
```
