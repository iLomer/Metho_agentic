import { describe, it, expect } from "vitest";
import { generateMcpConfig } from "../../../src/cli/scaffold/mcp-config.js";
import type { McpSelection } from "../../../src/cli/scaffold/mcp-config.js";

describe("generateMcpConfig", () => {
  it("returns valid JSON for a single selection", () => {
    const selections: McpSelection[] = ["github"];
    expect(() => JSON.parse(generateMcpConfig(selections))).not.toThrow();
  });

  it("returns valid JSON for multiple selections", () => {
    const selections: McpSelection[] = ["github", "sentry", "postgres"];
    expect(() => JSON.parse(generateMcpConfig(selections))).not.toThrow();
  });

  it("returns valid JSON for empty selection", () => {
    expect(() => JSON.parse(generateMcpConfig([]))).not.toThrow();
  });

  it("uses mcpServers key at root", () => {
    const parsed = JSON.parse(generateMcpConfig(["github"])) as Record<string, unknown>;
    expect(parsed).toHaveProperty("mcpServers");
  });

  it("includes github server definition with env", () => {
    const parsed = JSON.parse(generateMcpConfig(["github"])) as {
      mcpServers: Record<string, { command: string; args: string[]; env: Record<string, string> }>;
    };
    expect(parsed.mcpServers).toHaveProperty("github");
    expect(parsed.mcpServers.github.command).toBe("npx");
    expect(parsed.mcpServers.github.args).toContain("@modelcontextprotocol/server-github");
    expect(parsed.mcpServers.github.env).toHaveProperty("GITHUB_TOKEN");
  });

  it("includes sentry server definition with env", () => {
    const parsed = JSON.parse(generateMcpConfig(["sentry"])) as {
      mcpServers: Record<string, { command: string; args: string[]; env: Record<string, string> }>;
    };
    expect(parsed.mcpServers).toHaveProperty("sentry");
    expect(parsed.mcpServers.sentry.command).toBe("npx");
    expect(parsed.mcpServers.sentry.args).toContain("@modelcontextprotocol/server-sentry");
    expect(parsed.mcpServers.sentry.env).toHaveProperty("SENTRY_AUTH_TOKEN");
    expect(parsed.mcpServers.sentry.env).toHaveProperty("SENTRY_ORG");
  });

  it("includes postgres server definition with env", () => {
    const parsed = JSON.parse(generateMcpConfig(["postgres"])) as {
      mcpServers: Record<string, { command: string; args: string[]; env: Record<string, string> }>;
    };
    expect(parsed.mcpServers).toHaveProperty("postgres");
    expect(parsed.mcpServers.postgres.command).toBe("npx");
    expect(parsed.mcpServers.postgres.args).toContain("@modelcontextprotocol/server-postgres");
    expect(parsed.mcpServers.postgres.env).toHaveProperty("DATABASE_URL");
  });

  it("includes all selected servers in multiple selection", () => {
    const parsed = JSON.parse(generateMcpConfig(["github", "sentry", "postgres"])) as {
      mcpServers: Record<string, unknown>;
    };
    expect(parsed.mcpServers).toHaveProperty("github");
    expect(parsed.mcpServers).toHaveProperty("sentry");
    expect(parsed.mcpServers).toHaveProperty("postgres");
  });

  it("returns empty mcpServers object for empty selection", () => {
    const parsed = JSON.parse(generateMcpConfig([])) as {
      mcpServers: Record<string, unknown>;
    };
    expect(Object.keys(parsed.mcpServers)).toHaveLength(0);
  });

  it("does not include unselected servers", () => {
    const parsed = JSON.parse(generateMcpConfig(["github"])) as {
      mcpServers: Record<string, unknown>;
    };
    expect(parsed.mcpServers).not.toHaveProperty("sentry");
    expect(parsed.mcpServers).not.toHaveProperty("postgres");
  });

  it("github env value uses placeholder token syntax", () => {
    const parsed = JSON.parse(generateMcpConfig(["github"])) as {
      mcpServers: Record<string, { env: Record<string, string> }>;
    };
    expect(parsed.mcpServers.github.env["GITHUB_TOKEN"]).toBe("${GITHUB_TOKEN}");
  });

  it("postgres env value uses placeholder token syntax", () => {
    const parsed = JSON.parse(generateMcpConfig(["postgres"])) as {
      mcpServers: Record<string, { env: Record<string, string> }>;
    };
    expect(parsed.mcpServers.postgres.env["DATABASE_URL"]).toBe("${DATABASE_URL}");
  });

  it("github args include -y flag", () => {
    const parsed = JSON.parse(generateMcpConfig(["github"])) as {
      mcpServers: Record<string, { args: string[] }>;
    };
    expect(parsed.mcpServers.github.args).toContain("-y");
  });
});
