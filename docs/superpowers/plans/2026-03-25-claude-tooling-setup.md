# Claude Tooling Setup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatically install Superpowers plugin, Context7 MCP, Sequential Thinking MCP, and ccstatusline into `~/.claude/settings.json` during `meto init`.

**Architecture:** A single pure module `setup-claude-tooling.ts` handles all settings manipulation (read → deep merge → write). The ccstatusline interactive step is spawned separately with inherited stdio. The module is called from `src/cli/index.ts` after git init, before the "What's Next" note.

**Tech Stack:** Node.js `fs/promises`, `node:os` (homedir), `node:child_process` (spawnSync for ccstatusline), TypeScript strict mode, vitest for tests.

---

## File Map

| Action | Path |
|---|---|
| **Create** | `src/cli/init/setup-claude-tooling.ts` |
| **Create** | `tests/cli/setup-claude-tooling.test.ts` |
| **Modify** | `src/cli/index.ts` — call setup after git init |

---

## Task 1: Write the module skeleton + types

**Files:**
- Create: `src/cli/init/setup-claude-tooling.ts`

- [ ] **Step 1: Create the file with types and the read/write helpers**

```typescript
// src/cli/init/setup-claude-tooling.ts
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { spawnSync } from "node:child_process";

export interface ClaudeSettings {
  enabledPlugins?: Record<string, boolean>;
  mcpServers?: Record<string, { command: string; args: string[] }>;
  [key: string]: unknown;
}

export interface SetupResult {
  success: boolean;
  warning?: string;
}

function claudeSettingsPath(): string {
  return join(homedir(), ".claude", "settings.json");
}

async function readSettings(path: string): Promise<ClaudeSettings> {
  try {
    const raw = await readFile(path, "utf-8");
    return JSON.parse(raw) as ClaudeSettings;
  } catch {
    return {};
  }
}

async function writeSettings(path: string, settings: ClaudeSettings): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(settings, null, 4), "utf-8");
}
```

- [ ] **Step 2: Add the merge logic**

```typescript
export function mergeTooling(existing: ClaudeSettings): ClaudeSettings {
  const result: ClaudeSettings = { ...existing };

  // Superpowers plugin
  result.enabledPlugins = {
    ...existing.enabledPlugins,
    "superpowers@claude-plugins-official": true,
  };

  // MCP servers
  result.mcpServers = {
    ...existing.mcpServers,
    "context7": {
      command: "npx",
      args: ["-y", "@upstash/context7-mcp@latest"],
    },
    "sequential-thinking": {
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-sequential-thinking"],
    },
  };

  return result;
}
```

- [ ] **Step 3: Add the main exported function (without ccstatusline yet)**

```typescript
export async function setupClaudeTooling(): Promise<SetupResult> {
  const path = claudeSettingsPath();
  try {
    const existing = await readSettings(path);
    const merged = mergeTooling(existing);
    await writeSettings(path, merged);
    return { success: true };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return { success: false, warning: `Could not update ~/.claude/settings.json: ${msg}` };
  }
}
```

---

## Task 2: Write tests for the merge logic

**Files:**
- Create: `tests/cli/setup-claude-tooling.test.ts`

- [ ] **Step 1: Write failing tests for mergeTooling**

```typescript
import { describe, it, expect } from "vitest";
import { mergeTooling } from "../../src/cli/init/setup-claude-tooling.js";
import type { ClaudeSettings } from "../../src/cli/init/setup-claude-tooling.js";

describe("mergeTooling", () => {
  it("adds all entries to empty settings", () => {
    const result = mergeTooling({});
    expect(result.enabledPlugins?.["superpowers@claude-plugins-official"]).toBe(true);
    expect(result.mcpServers?.["context7"]).toBeDefined();
    expect(result.mcpServers?.["sequential-thinking"]).toBeDefined();
  });

  it("preserves existing enabledPlugins entries", () => {
    const existing: ClaudeSettings = {
      enabledPlugins: { "other-plugin@somewhere": true },
    };
    const result = mergeTooling(existing);
    expect(result.enabledPlugins?.["other-plugin@somewhere"]).toBe(true);
    expect(result.enabledPlugins?.["superpowers@claude-plugins-official"]).toBe(true);
  });

  it("preserves existing mcpServers entries", () => {
    const existing: ClaudeSettings = {
      mcpServers: { "my-server": { command: "node", args: ["server.js"] } },
    };
    const result = mergeTooling(existing);
    expect(result.mcpServers?.["my-server"]).toBeDefined();
    expect(result.mcpServers?.["context7"]).toBeDefined();
  });

  it("preserves other top-level keys", () => {
    const existing: ClaudeSettings = { permissions: { allow: ["Read"] } };
    const result = mergeTooling(existing);
    expect(result.permissions).toEqual({ allow: ["Read"] });
  });

  it("is idempotent — running twice produces the same output", () => {
    const first = mergeTooling({});
    const second = mergeTooling(first);
    expect(second).toEqual(first);
  });

  it("context7 MCP has correct command and args", () => {
    const result = mergeTooling({});
    expect(result.mcpServers?.["context7"]).toEqual({
      command: "npx",
      args: ["-y", "@upstash/context7-mcp@latest"],
    });
  });

  it("sequential-thinking MCP has correct command and args", () => {
    const result = mergeTooling({});
    expect(result.mcpServers?.["sequential-thinking"]).toEqual({
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-sequential-thinking"],
    });
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL (module doesn't exist yet)**

```bash
npx vitest run tests/cli/setup-claude-tooling.test.ts
```

Expected: FAIL with import error

- [ ] **Step 3: Run tests after Task 1 is complete — expect PASS**

```bash
npx vitest run tests/cli/setup-claude-tooling.test.ts
```

Expected: 7 tests pass

- [ ] **Step 4: Commit**

```bash
git add src/cli/init/setup-claude-tooling.ts tests/cli/setup-claude-tooling.test.ts
git commit -m "feat(init): add setup-claude-tooling module with merge logic [dev-agent]"
```

---

## Task 3: Add ccstatusline interactive spawn

**Files:**
- Modify: `src/cli/init/setup-claude-tooling.ts`

- [ ] **Step 1: Write the failing test first**

Add to `tests/cli/setup-claude-tooling.test.ts`:

```typescript
import { vi } from "vitest";
import * as childProcess from "node:child_process";

describe("runCcstatusline", () => {
  it("spawns npx ccstatusline@latest with inherited stdio", () => {
    const spy = vi.spyOn(childProcess, "spawnSync").mockReturnValue({
      status: 0, signal: null, error: undefined,
      pid: 1, output: [], stdout: Buffer.from(""), stderr: Buffer.from(""),
    });

    const { runCcstatusline } = await import("../../src/cli/init/setup-claude-tooling.js");
    runCcstatusline();

    expect(spy).toHaveBeenCalledWith("npx", ["ccstatusline@latest"], { stdio: "inherit" });
    spy.mockRestore();
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npx vitest run tests/cli/setup-claude-tooling.test.ts
```

- [ ] **Step 3: Add the export to the module**

```typescript
export function runCcstatusline(): void {
  spawnSync("npx", ["ccstatusline@latest"], { stdio: "inherit" });
}
```

- [ ] **Step 4: Run — expect all tests PASS**

```bash
npx vitest run tests/cli/setup-claude-tooling.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/cli/init/setup-claude-tooling.ts tests/cli/setup-claude-tooling.test.ts
git commit -m "feat(init): add ccstatusline interactive spawn [dev-agent]"
```

---

## Task 4: Wire into meto init

**Files:**
- Modify: `src/cli/index.ts` — import and call after git init, before "What's Next"

- [ ] **Step 1: Add the import at the top of `src/cli/index.ts`**

```typescript
import { setupClaudeTooling, runCcstatusline } from "./init/setup-claude-tooling.js";
```

- [ ] **Step 2: Insert the call block after `gitSpinner.stop(...)` and before the `nextSteps` block (around line 342)**

```typescript
// Claude tooling setup
const toolingResult = await setupClaudeTooling();
if (toolingResult.success) {
  p.log.success("Claude tooling installed (Superpowers, Context7, Sequential Thinking)");
  p.log.info("Setting up Claude Code status line...");
  runCcstatusline();
} else {
  p.log.warn(`Claude tooling setup skipped: ${toolingResult.warning}`);
}
```

- [ ] **Step 3: Run the full test suite to confirm nothing is broken**

```bash
npx vitest run
```

Expected: all existing tests still pass + new tests pass

- [ ] **Step 4: Commit**

```bash
git add src/cli/index.ts
git commit -m "feat(init): wire claude tooling setup into meto init [dev-agent]"
```

---

## Task 5: Manual smoke test

- [ ] **Step 1: Build and run locally**

```bash
npm run build && node dist/cli/index.js init --dry-run
```

Expected: dry run completes without errors

- [ ] **Step 2: Check `~/.claude/settings.json` has the new entries**

```bash
cat ~/.claude/settings.json
```

Expected: `superpowers@claude-plugins-official`, `context7`, `sequential-thinking` present

- [ ] **Step 3: Run full test suite one final time**

```bash
npx vitest run
```

Expected: all tests pass
