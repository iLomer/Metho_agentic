import { describe, it, expect } from "vitest";
import { planSwarmRepair } from "../../src/cli/repair/swarm-repair.js";
import type { SwarmRepairInput } from "../../src/cli/repair/swarm-repair.js";
import { parseSwarmAwareness } from "../../src/cli/swarm-parser.js";

const TEMPLATE = [
  "---",
  "name: meto-epic-{{EPIC_ID}}",
  "---",
  "",
  "You implement the slices of {{EPIC_NAME}} ({{EPIC_ID}}), and only those.",
  "",
  "- Your domain: `{{EPIC_DOMAIN}}` (the authoritative list is `ai/swarm/domain-map.md`)",
  "",
].join("\n");

const agent = (id: string, name: string, domain: string): string =>
  TEMPLATE.replaceAll("{{EPIC_ID}}", id).replaceAll("{{EPIC_NAME}}", name).replaceAll("{{EPIC_DOMAIN}}", domain);

const swarm = (rows: string[]): string =>
  [
    "# SWARM_AWARENESS — Demo",
    "",
    "## [swarm:meta]",
    "- **Project:** Demo",
    "",
    "## [swarm:epics]",
    "",
    "| Epic ID | Name | Agent | Status | Tasks Done | Blocker |",
    "|---|---|---|---|---|---|",
    ...rows,
    "",
    "Status values: `not-started` · `on-track` · `blocked` · `testing-ready` · `complete`",
    "",
    "## [swarm:checkpoints]",
    "",
  ].join("\n");

const domainMap = (rows: string[]): string =>
  ["# Domain Map", "", "## Epic Domains", "", "| Epic ID | Epic Name | Owns | Shared With |", "|---|---|---|---|", ...rows, "", "## Shared Files", ""].join("\n");

const slice = (id: string, epic?: string): string =>
  [`## [${id}] -- Something`, epic === undefined ? "**Size:** S" : `**Epic:** ${epic} | **Size:** S`, ""].join("\n");

/** A healthy two-epic swarm project. */
function healthy(): SwarmRepairInput {
  return {
    epics: "## E1 -- Auth\n\n## E2 -- Billing\n",
    swarm: swarm([
      "| E1 | Auth | meto-epic-E1 | on-track | 0 | none |",
      "| E2 | Billing | meto-epic-E2 | not-started | 0 | none |",
    ]),
    domainMap: domainMap(["| E1 | Auth | `src/auth` | none |", "| E2 | Billing | `src/billing` | none |"]),
    board: { backlog: "", todo: slice("slice-001", "E1"), inProgress: "", inTesting: "", done: "" },
    agents: { E1: agent("E1", "Auth", "src/auth"), E2: agent("E2", "Billing", "src/billing") },
    memories: ["E1", "E2"],
    epicTemplate: TEMPLATE,
  };
}

const paths = (plan: ReturnType<typeof planSwarmRepair>): string[] => plan.actions.map((a) => a.path);

describe("planSwarmRepair", () => {
  it("plans nothing for a healthy project", () => {
    const plan = planSwarmRepair(healthy());
    expect(plan.actions).toEqual([]);
    expect(plan.reports).toEqual([]);
  });

  it("creates the agent and memory file of an epic that has none", () => {
    const input = healthy();
    input.epics += "\n## E3 -- Search\n";
    input.domainMap = domainMap([
      "| E1 | Auth | `src/auth` | none |",
      "| E2 | Billing | `src/billing` | none |",
      "| E3 | Search | `src/search`, `src/index` | none |",
    ]);

    const plan = planSwarmRepair(input);
    const created = plan.actions.find((a) => a.path === ".claude/agents/epic-agent-E3.md");

    expect(created?.kind).toBe("add");
    expect(created?.content).toContain("name: meto-epic-E3");
    expect(created?.content).toContain("slices of Search (E3)");
    expect(created?.content).toContain("- Your domain: `src/search, src/index`");
    expect(paths(plan)).toContain(".claude/agent-memory/meto-epic-E3/MEMORY.md");
  });

  it("adds only the memory file when the agent exists", () => {
    const input = healthy();
    input.memories = ["E1"];
    expect(paths(planSwarmRepair(input))).toEqual([".claude/agent-memory/meto-epic-E2/MEMORY.md"]);
  });

  it("adds a row to the swarm table for an epic that has none", () => {
    const input = healthy();
    input.epics += "\n## E3 -- Search\n";
    input.agents.E3 = agent("E3", "Search", "to be assigned by @meto-pm");
    input.memories.push("E3");
    input.board.todo += slice("slice-002", "E3");

    const plan = planSwarmRepair(input);
    const action = plan.actions.find((a) => a.path === "ai/swarm/SWARM_AWARENESS.md");
    const epics = parseSwarmAwareness(action?.content ?? "").epics;

    expect(action?.kind).toBe("merge");
    expect(epics.map((e) => e.id)).toEqual(["E1", "E2", "E3"]);
    expect(epics[2]).toMatchObject({ name: "Search", agent: "meto-epic-E3", status: "not-started", tasksDone: 0 });
    // Text outside the table is untouched
    expect(action?.content).toContain("Status values: `not-started`");
    expect(action?.content).toContain("## [swarm:checkpoints]");
  });

  it("replaces the placeholder row and marks a finished epic complete", () => {
    const input = healthy();
    input.swarm = swarm(["| *(populated at swarm init by @meto-pm)* | | | not-started | 0 | none |"]);
    input.board.todo = slice("slice-003", "E2");
    input.board.done = slice("slice-001", "E1") + slice("slice-002", "E1");

    const action = planSwarmRepair(input).actions.find((a) => a.path === "ai/swarm/SWARM_AWARENESS.md");
    const epics = parseSwarmAwareness(action?.content ?? "").epics;

    expect(action?.content).not.toContain("populated at swarm init");
    expect(epics).toHaveLength(2);
    expect(epics[0]).toMatchObject({ id: "E1", status: "complete", tasksDone: 2 });
    expect(epics[1]).toMatchObject({ id: "E2", status: "not-started" });
  });

  it("reopens a complete epic that has slices to build", () => {
    const input = healthy();
    input.swarm = swarm([
      "| E1 | Auth | meto-epic-E1 | complete | 4 | none |",
      "| E2 | Billing | meto-epic-E2 | complete | 2 | none |",
    ]);

    const action = planSwarmRepair(input).actions.find((a) => a.path === "ai/swarm/SWARM_AWARENESS.md");
    const epics = parseSwarmAwareness(action?.content ?? "").epics;

    expect(epics[0]).toMatchObject({ id: "E1", status: "on-track", tasksDone: 4 });
    expect(epics[1]).toMatchObject({ id: "E2", status: "complete" });
    expect(action?.description).toContain("E1");
  });

  it("sets a complete epic with slices only in testing to testing-ready", () => {
    const input = healthy();
    input.swarm = swarm([
      "| E1 | Auth | meto-epic-E1 | complete | 4 | none |",
      "| E2 | Billing | meto-epic-E2 | not-started | 0 | none |",
    ]);
    input.board.todo = "";
    input.board.inTesting = slice("slice-009", "E1");

    const action = planSwarmRepair(input).actions.find((a) => a.path === "ai/swarm/SWARM_AWARENESS.md");
    expect(parseSwarmAwareness(action?.content ?? "").epics[0]?.status).toBe("testing-ready");
  });

  it("re-renders an agent whose domain differs from the domain map", () => {
    const input = healthy();
    input.agents.E2 = agent("E2", "Billing", "to be assigned by @meto-pm");

    const plan = planSwarmRepair(input);

    expect(plan.actions).toHaveLength(1);
    expect(plan.actions[0]).toMatchObject({ path: ".claude/agents/epic-agent-E2.md", kind: "replace" });
    expect(plan.actions[0]?.content).toContain("- Your domain: `src/billing`");
  });

  it("keeps CRLF line endings in the swarm file", () => {
    const input = healthy();
    input.swarm = swarm(["| E1 | Auth | meto-epic-E1 | complete | 4 | none |", "| E2 | Billing | meto-epic-E2 | not-started | 0 | none |"]).replace(/\n/g, "\r\n");

    const action = planSwarmRepair(input).actions.find((a) => a.path === "ai/swarm/SWARM_AWARENESS.md");
    expect(action?.content).toContain("| on-track |");
    expect(action?.content?.replace(/\r\n/g, "")).not.toContain("\n");
  });

  it("reports an epic with open slices and no domain, without writing one", () => {
    const input = healthy();
    input.domainMap = domainMap(["| E2 | Billing | `src/billing` | none |"]);

    const plan = planSwarmRepair(input);

    expect(plan.actions).toEqual([]);
    expect(plan.reports).toHaveLength(1);
    expect(plan.reports[0]?.path).toBe("ai/swarm/domain-map.md");
    expect(plan.reports[0]?.message).toContain("E1");
  });

  it("reports a slice tagged with an epic that does not exist", () => {
    const input = healthy();
    input.board.todo += slice("slice-007", "E9");

    const plan = planSwarmRepair(input);

    expect(plan.actions).toEqual([]);
    expect(plan.reports.map((r) => r.message).join("\n")).toMatch(/slice-007.*E9/);
  });

  it("reports a slice ID that sits in two columns", () => {
    const input = healthy();
    input.board.done = slice("slice-001", "E1");

    const plan = planSwarmRepair(input);

    expect(plan.reports.map((r) => r.message).join("\n")).toMatch(/slice-001.*todo.*done/);
  });

  it("reports when epics.md has no epic, and plans nothing", () => {
    const input = healthy();
    input.epics = "# Epics\n\nNothing yet.\n";

    const plan = planSwarmRepair(input);

    expect(plan.actions).toEqual([]);
    expect(plan.reports[0]?.path).toBe("ai/backlog/epics.md");
  });

  it("reads epic headings written with a dash or a colon", () => {
    const input = healthy();
    input.epics = "## E1 — Auth\n\n## E2: Billing\n";
    expect(planSwarmRepair(input).actions).toEqual([]);
  });
});
