import { spawnSync } from "node:child_process";

/**
 * Runs the interactive ccstatusline installer.
 *
 * MCP servers are no longer written to ~/.claude/settings.json: Claude Code
 * does not read MCP servers from that file. Project MCP servers go into
 * `.mcp.json` instead (see scaffold/mcp-config.ts).
 */
export function runCcstatusline(): void {
  spawnSync("npx", ["ccstatusline@latest"], { stdio: "inherit" });
}
