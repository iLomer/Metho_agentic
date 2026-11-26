import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtemp, mkdir, readFile, rm, writeFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { planRepair, repairProject } from "../../src/cli/repair/index.js";
import { readSwarmState } from "../../src/cli/swarm-state.js";

const CLAUDE_MD = [
  "# Demo",
  "",
  "A demo product.",
  "",
  "## Stack",
  "TypeScript",
  "",
  "## Code Conventions",
  "Strict mode.",
  "",
].join("\n");

const SWARM = [
  "# SWARM_AWARENESS — Demo",
  "",
  "## [swarm:meta]",
  "- **Project:** Demo",
  "",
  "## [swarm:epics]",
  "",
  "| Epic ID | Name | Agent | Status | Tasks Done | Blocker |",
  "|---|---|---|---|---|---|",
  "| E1 | Auth | meto-epic-E1 | complete | 3 | none |",
  "",
  "## [swarm:checkpoints]",
  "",
].join("\n");

const DOMAINS = [
  "# Domain Map",
  "",
  "## Epic Domains",
  "",
  "| Epic ID | Epic Name | Owns | Shared With |",
  "|---|---|---|---|",
  "| E1 | Auth | `src/auth` | none |",
  "| E2 | Search | `src/search` | none |",
  "",
].join("\n");

const slice = (id: string, epic: string): string => `## [${id}] -- Something\n**Epic:** ${epic} | **Size:** S\n\n`;

describe("repair", () => {
  let dir: string;

  async function put(path: string, content: string): Promise<void> {
    const target = join(dir, path);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, content, "utf-8");
  }

  const get = (path: string): Promise<string> => readFile(join(dir, path), "utf-8");
  const exists = (path: string): Promise<boolean> => stat(join(dir, path)).then(() => true, () => false);
  const apply = () => repairProject(dir, { check: false, yes: true, swarmOnly: false });

  /** A swarm project whose swarm files were never updated after the first epic. */
  async function stuckSwarm(): Promise<void> {
    await put("ai/backlog/epics.md", "## E1 -- Auth\n\n## E2 -- Search\n");
    await put("ai/swarm/SWARM_AWARENESS.md", SWARM);
    await put("ai/swarm/domain-map.md", DOMAINS);
    await put("ai/tasks/tasks-todo.md", `# Tasks Todo\n\n${slice("slice-010", "E1")}${slice("slice-011", "E2")}`);
  }

  beforeEach(async () => {
    vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    dir = await mkdtemp(join(tmpdir(), "meto-repair-"));
    await put("CLAUDE.md", CLAUDE_MD);
    for (const name of ["backlog", "todo", "in-progress", "in-testing", "done"]) {
      await put(`ai/tasks/tasks-${name}.md`, `# Tasks\n`);
    }
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(dir, { recursive: true, force: true });
  });

  it("unsticks a swarm: agent, table row and reopened epic", async () => {
    await stuckSwarm();

    const result = await apply();

    expect(result.applied).toBe(result.actions.length);
    expect(await get(".claude/agents/epic-agent-E2.md")).toContain("- Your domain: `src/search`");
    expect(await exists(".claude/agent-memory/meto-epic-E2/MEMORY.md")).toBe(true);

    const state = await readSwarmState(dir);
    expect(state.epics.map((e) => [e.id, e.status, e.todo])).toEqual([
      ["E1", "on-track", 1],
      ["E2", "not-started", 1],
    ]);
  });

  it("finds nothing to repair the second time, and writes no file", async () => {
    await stuckSwarm();
    await apply();
    const before = await get("ai/swarm/SWARM_AWARENESS.md");

    const again = await planRepair(dir, { swarmOnly: false });
    const result = await apply();

    expect(again.actions).toEqual([]);
    expect(result.applied).toBe(0);
    expect(await get("ai/swarm/SWARM_AWARENESS.md")).toBe(before);
  });

  it("--check writes nothing", async () => {
    await stuckSwarm();

    const result = await repairProject(dir, { check: true, yes: true, swarmOnly: false });

    expect(result.actions.length).toBeGreaterThan(0);
    expect(result.applied).toBe(0);
    expect(await exists(".claude/agents/epic-agent-E2.md")).toBe(false);
    expect(await get("ai/swarm/SWARM_AWARENESS.md")).toBe(SWARM);
  });

  it("--swarm plans only the swarm files", async () => {
    await stuckSwarm();
    await rm(join(dir, "ai/tasks/tasks-done.md"));

    const plan = await planRepair(dir, { swarmOnly: true });
    const paths = plan.actions.map((a) => a.path).sort();

    expect(paths).toEqual([
      ".claude/agent-memory/meto-epic-E1/MEMORY.md",
      ".claude/agent-memory/meto-epic-E2/MEMORY.md",
      ".claude/agents/epic-agent-E1.md",
      ".claude/agents/epic-agent-E2.md",
      "ai/swarm/SWARM_AWARENESS.md",
    ]);
  });

  it("reports what a person must settle and leaves that file alone", async () => {
    await stuckSwarm();
    await put("ai/swarm/domain-map.md", DOMAINS.replace("| E2 | Search | `src/search` | none |\n", ""));
    const before = await get("ai/swarm/domain-map.md");

    const result = await apply();

    expect(result.reports.map((r) => r.path)).toContain("ai/swarm/domain-map.md");
    expect(await get("ai/swarm/domain-map.md")).toBe(before);
  });

  it("plans no swarm repair in a sprint project", async () => {
    await put("ai/backlog/epics.md", "## E1 -- Auth\n\n## E2 -- Search\n");
    await put("ai/tasks/tasks-todo.md", `# Tasks Todo\n\n${slice("slice-010", "E2")}`);

    const plan = await planRepair(dir, { swarmOnly: false });

    expect(plan.reports).toEqual([]);
    expect(plan.actions.some((a) => a.path.includes("epic-agent") || a.path.startsWith("ai/swarm/"))).toBe(false);
  });

  it("adds a missing board column", async () => {
    await rm(join(dir, "ai/tasks/tasks-in-testing.md"));

    const plan = await planRepair(dir, { swarmOnly: false });
    const action = plan.actions.find((a) => a.path === "ai/tasks/tasks-in-testing.md");

    expect(action).toMatchObject({ kind: "add", content: "# Tasks In Testing\n" });
  });

  it("adds a missing domain map in a swarm project", async () => {
    await stuckSwarm();
    await rm(join(dir, "ai/swarm/domain-map.md"));

    const plan = await planRepair(dir, { swarmOnly: true });
    const action = plan.actions.find((a) => a.path === "ai/swarm/domain-map.md");

    expect(action?.kind).toBe("add");
    expect(action?.content).toContain("# Domain Map — Demo");
  });
});
