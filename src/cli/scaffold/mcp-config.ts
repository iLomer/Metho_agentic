export type McpSelection = "github" | "sentry" | "postgres";

interface McpServerDefinition {
  command: string;
  args: string[];
  env: Record<string, string>;
}

const MCP_SERVER_DEFINITIONS: Record<McpSelection, McpServerDefinition> = {
  github: {
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-github"],
    env: {
      GITHUB_TOKEN: "${GITHUB_TOKEN}",
    },
  },
  sentry: {
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-sentry"],
    env: {
      SENTRY_AUTH_TOKEN: "${SENTRY_AUTH_TOKEN}",
      SENTRY_ORG: "${SENTRY_ORG}",
    },
  },
  postgres: {
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-postgres"],
    env: {
      DATABASE_URL: "${DATABASE_URL}",
    },
  },
};

/**
 * Generates a `.mcp.json` content string for the given MCP server selections.
 * Returns a valid JSON string with the `mcpServers` key.
 * If no selections are provided, returns an empty `mcpServers` object.
 */
export function generateMcpConfig(selections: McpSelection[]): string {
  const mcpServers: Record<string, McpServerDefinition> = {};

  for (const selection of selections) {
    mcpServers[selection] = MCP_SERVER_DEFINITIONS[selection];
  }

  return JSON.stringify({ mcpServers }, null, 2);
}
