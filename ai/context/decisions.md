# Decisions Log

Settled decisions. Never re-debate these. Add new entries as decisions are made.

---

## D001 — Tauri over Electron
**Date:** 2025-03
**Decision:** Use Tauri (Rust) as the desktop shell
**Alternatives considered:** Electron
**Reason:** App size a few MB vs 150MB+, faster, native feel, built-in auto-update, no bundled Chromium
**Consequences:** Rust required for native commands; UI still Next.js so frontend dev is unchanged

---

## D002 — User's Claude subscription, not API keys
**Date:** 2025-03
**Decision:** Invoke Claude Code as a CLI subprocess using the user's existing subscription
**Alternatives considered:** Anthropic API with user-provided API key
**Reason:** No API cost to Lom operator, trust through design (user owns their subscription), no key management
**Consequences:** Claude Code must be installed on user's machine; Lom checks for it at startup

---

## D003 — OAuth for all integrations
**Date:** 2025-03
**Decision:** GitHub, Vercel, Supabase all connected via OAuth only
**Alternatives considered:** Manual token entry
**Reason:** Trust through design — user authorizes via each platform's own login screen, no passwords typed into Lom
**Consequences:** Each integration needs a registered OAuth app

---

## D004 — No sign-up, no Lom account
**Date:** 2025-03
**Decision:** Lom requires no account creation — app opens and asks to connect tools
**Alternatives considered:** User accounts for project sync, team features
**Reason:** Trust through design, reduces onboarding friction, local-first by default
**Consequences:** No cloud sync in v1, no team features in v1

---

## D005 — /templates/ is sacred, never hardcode scaffold content
**Date:** 2025-03
**Decision:** All scaffold files the app generates live in /templates/ — source code reads from there
**Alternatives considered:** Hardcoded strings in source, separate npm package for templates
**Reason:** Templates must be editable without touching source code; separation of concerns
**Consequences:** Build process must bundle /templates/ into the app binary

---

## D006 — Two components: desktop app + CLI
**Date:** 2025-03
**Decision:** Lom ships as both a Tauri desktop app and a CLI (`npx lom init`)
**Alternatives considered:** Desktop app only, CLI only
**Reason:** Desktop targets non-developers; CLI targets developers who live in terminal. Same methodology, two entry points.
**Consequences:** Shared template core; CLI is a separate Node.js package that reads the same /templates/

---

*(Add new decisions here — newest at the bottom)*
