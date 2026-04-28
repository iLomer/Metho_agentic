# Tasks — Done

Completed slices. Tester has signed off on every item here.

---

## [slice-101] -- Compact module scaffold and @anthropic-ai/sdk dependency
**Epic:** E27 | **Size:** XS | **Depends on:** none

**User Story**
As a developer, I want a scaffold for the compact module so that subsequent slices have a home for the implementation.

**Acceptance Criteria**
- [x] `src/cli/compact/index.ts` created with `CompactResult` type and `compactDone` stub
- [x] `@anthropic-ai/sdk` added to dependencies
- [x] `npx tsc --noEmit` passes

**Completed:** 2026-04-20

---

## [slice-102] -- Implement compactDone with Claude Haiku summarization
**Epic:** E27 | **Size:** M | **Depends on:** slice-101

**User Story**
As a developer, I want `compactDone` to call the Anthropic API with each task block and produce a compacted output file so that tasks-done.md stays within token limits.

**Acceptance Criteria**
- [x] Parses tasks-done.md into preamble + task blocks using `\n---\n` separator
- [x] Calls `claude-haiku-4-5` with max_tokens 200 for each task block
- [x] Output format: `## [slice-NNN] -- Name (COMPACTED)\nEpic: EN | Outcome: summary`
- [x] Throws if `ANTHROPIC_API_KEY` is not set
- [x] Writes compacted content back to disk
- [x] `npx tsc --noEmit` passes

**Completed:** 2026-04-21

---

## [slice-103] -- meto compact CLI command with --dry-run flag
**Epic:** E27 | **Size:** S | **Depends on:** slice-101

**User Story**
As a developer agent, I want to run `meto compact` from the CLI so that I can compact tasks-done.md without manually invoking the function.

**Acceptance Criteria**
- [x] `compact` subcommand registered in `src/cli/index.ts`
- [x] `--dry-run` flag prints slice IDs and line counts without calling the API or writing to disk
- [x] `--help` flag prints usage information
- [x] Resolves `ai/tasks/tasks-done.md` via `findProjectRoot()`
- [x] Exits 1 on error with `p.log.error` message
- [x] `npx tsc --noEmit` passes

**Completed:** 2026-04-22

---
