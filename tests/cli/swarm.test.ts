import { describe, it, expect } from "vitest";
import {
  parseEpics,
  generateEpicAgents,
  generateSwarmSettings,
} from "../../src/cli/swarm.js";

describe("parseEpics", () => {
  it("extracts epic IDs and names from standard format", () => {
    const content = [
      "## E1 -- Project Setup",
      "**Goal:** Initialize the project",
      "",
      "---",
      "",
      "## E2 -- Core Feature",
      "**Goal:** Build the main feature",
      "",
      "---",
      "",
      "## E3 -- Testing",
      "**Goal:** Add tests",
    ].join("\n");

    const epics = parseEpics(content);

    expect(epics).toHaveLength(3);
    expect(epics[0]).toEqual({ id: "E1", name: "Project Setup" });
    expect(epics[1]).toEqual({ id: "E2", name: "Core Feature" });
    expect(epics[2]).toEqual({ id: "E3", name: "Testing" });
  });

  it("returns empty array when no epics found", () => {
    const content = "# Some heading\nNo epics here";
    const epics = parseEpics(content);
    expect(epics).toEqual([]);
  });

  it("handles empty string", () => {
    const epics = parseEpics("");
    expect(epics).toEqual([]);
  });
});

describe("generateEpicAgents", () => {
  const template = [
    "---",
    "name: meto-epic-{{EPIC_ID}}",
    "---",
    "# Epic Agent -- {{EPIC_NAME}} ({{EPIC_ID}})",
    "Domain: {{EPIC_DOMAIN}}",
  ].join("\n");

  it("generates one agent file and one memory file per epic", () => {
    const epicsContent = [
      "## E1 -- Project Setup",
      "**Goal:** Init",
      "---",
      "## E2 -- Core Feature",
      "**Goal:** Build",
      "---",
      "## E3 -- Testing",
      "**Goal:** Test",
    ].join("\n");

    const files = generateEpicAgents(epicsContent, template);

    // 3 epics x 2 files each (agent + memory) = 6 files
    expect(files).toHaveLength(6);

    // Agent files
    const agentFiles = files.filter((f) =>
      f.relativePath.startsWith(".claude/agents/epic-agent-"),
    );
    expect(agentFiles).toHaveLength(3);

    expect(agentFiles[0].relativePath).toBe(".claude/agents/epic-agent-E1.md");
    expect(agentFiles[0].content).toContain("meto-epic-E1");
    expect(agentFiles[0].content).toContain("Project Setup");
    expect(agentFiles[0].content).toContain(
      "to be assigned by @meto-pm",
    );

    expect(agentFiles[1].relativePath).toBe(".claude/agents/epic-agent-E2.md");
    expect(agentFiles[1].content).toContain("Core Feature");

    expect(agentFiles[2].relativePath).toBe(".claude/agents/epic-agent-E3.md");
    expect(agentFiles[2].content).toContain("Testing");

    // Memory files
    const memoryFiles = files.filter((f) =>
      f.relativePath.startsWith(".claude/agent-memory/meto-epic-"),
    );
    expect(memoryFiles).toHaveLength(3);

    expect(memoryFiles[0].relativePath).toBe(
      ".claude/agent-memory/meto-epic-E1/MEMORY.md",
    );
    expect(memoryFiles[0].content).toContain("Project Setup (E1)");
    expect(memoryFiles[0].content).toContain("not-started");
  });

  it("returns empty array when no epics found", () => {
    const files = generateEpicAgents("No epics here", template);
    expect(files).toEqual([]);
  });

  it("replaces all tokens correctly in agent file", () => {
    const epicsContent = "## E5 -- Deploy Pipeline";
    const files = generateEpicAgents(epicsContent, template);

    const agentFile = files.find((f) =>
      f.relativePath.includes("epic-agent-E5"),
    );
    expect(agentFile).toBeDefined();
    expect(agentFile?.content).not.toContain("{{EPIC_ID}}");
    expect(agentFile?.content).not.toContain("{{EPIC_NAME}}");
    expect(agentFile?.content).not.toContain("{{EPIC_DOMAIN}}");
  });
});

describe("generateSwarmSettings", () => {
  it("generates settings with agent entries", () => {
    const settings = generateSwarmSettings(["E1", "E2", "E3"]);
    const parsed = JSON.parse(settings) as Record<string, unknown>;

    expect(parsed).toHaveProperty("env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS", "1");
    expect(parsed).toHaveProperty("agents");

    const agents = parsed.agents as Array<{ slug: string; file: string }>;
    expect(agents).toHaveLength(3);
    expect(agents[0]).toEqual({
      slug: "meto-epic-e1",
      file: ".claude/agents/epic-agent-E1.md",
    });
    expect(agents[2]).toEqual({
      slug: "meto-epic-e3",
      file: ".claude/agents/epic-agent-E3.md",
    });
  });

  it("generates empty agents array for no epics", () => {
    const settings = generateSwarmSettings([]);
    const parsed = JSON.parse(settings) as Record<string, unknown>;

    expect(parsed).toHaveProperty("env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS", "1");
    const agents = parsed.agents as Array<{ slug: string; file: string }>;
    expect(agents).toHaveLength(0);
  });
});
