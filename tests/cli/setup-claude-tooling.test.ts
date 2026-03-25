import { describe, it, expect } from "vitest";
import { mergeTooling } from "../../src/cli/init/setup-claude-tooling.js";
import type { ClaudeSettings } from "../../src/cli/init/setup-claude-tooling.js";

describe("mergeTooling", () => {
  it("adds all entries to empty settings", () => {
    const result = mergeTooling({});
    expect(result.mcpServers?.["context7"]).toBeDefined();
    expect(result.mcpServers?.["sequential-thinking"]).toBeDefined();
  });

  it("preserves existing enabledPlugins entries", () => {
    const existing: ClaudeSettings = {
      enabledPlugins: { "other-plugin@somewhere": true },
    };
    const result = mergeTooling(existing);
    expect(result.enabledPlugins?.["other-plugin@somewhere"]).toBe(true);
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
