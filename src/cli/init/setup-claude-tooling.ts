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
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      return {};
    }
    throw error;
  }
}

async function writeSettings(path: string, settings: ClaudeSettings): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(settings, null, 4), "utf-8");
}

export function mergeTooling(existing: ClaudeSettings): ClaudeSettings {
  const result: ClaudeSettings = { ...existing };

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

export function runCcstatusline(): void {
  spawnSync("npx", ["ccstatusline@latest"], { stdio: "inherit" });
}

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
