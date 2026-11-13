import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, mkdir, readFile, rm, writeFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  applyUpgradeAction,
  planUpgrade,
  upgradeClaudeMd,
  upgradeEpicAgent,
} from "../../src/cli/audit/upgrade.js";
import { cleanMemory, upgradeSettings } from "../../src/cli/audit/upgrade-content.js";
import { resolveTemplatesDir } from "../../src/cli/renderer.js";

const OLD_CLAUDE_MD = `# shop-api

An API for small shops.

## Read First
1. \`/ai/context/product-vision.md\` — what and why

---

## Agents

Human orchestrator reads the board and calls the right agent.

---

## Context Management

- **Context budget:** Grep before reading full files; max 10 files open before acting

---

## Stack
## Stack Overview

| Layer | Choice | Reason |
|---|---|---|
| API | FastAPI | async |

## Key Libraries
- pydantic

## Code Conventions
<!-- Keep to 3-4 rules max. More rules = more ignored. Focus on what actually causes bugs. -->
- Type hints everywhere
- No bare except

## Code Guidelines
See \`/ai/workflows/code-guidelines.md\` for file size limits.
`;

const OLD_MEMORY = `# Developer Agent Memory — shop-api

*Read at session start. Update at session end.*

**Session start checklist:**
- [ ] Read \`ai/handoff/current.md\` — understand current sprint state before doing anything else
- [ ] Read this MEMORY.md file

---

## Red Flags — Stop Before Acting

- Writing implementation code before a failing test exists → write the test first

## Codebase Map
- \`app/routes/orders.py\` holds the order endpoints

## Watch Out
- The test database is shared; reset it in fixtures
`;

const OLD_SETTINGS = JSON.stringify({
  env: { CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: "1", MY_FLAG: "on" },
  permissions: { allow: ["Bash(pytest *)"] },
  agents: [{ slug: "meto-tester", file: ".claude/agents/tester-agent.md" }],
  hooks: {
    SessionEnd: [
      {
        matcher: "",
        hooks: [
          {
            type: "command",
            command: "echo '\\n⚠️  Session ending — update your agent MEMORY.md before you go.'",
          },
        ],
      },
    ],
    PostToolUse: [{ matcher: "Edit", hooks: [{ type: "command", command: "ruff format" }] }],
  },
});

describe("upgradeClaudeMd", () => {
  it("keeps the name, vision, stack and conventions and drops the old sections", async () => {
    const template = await readFile(join(resolveTemplatesDir(), "CLAUDE.md"), "utf-8");
    const next = upgradeClaudeMd(OLD_CLAUDE_MD, template, "sprint");

    expect(next).toBeDefined();
    expect(next).toContain("# shop-api");
    expect(next).toContain("An API for small shops.");
    expect(next).toContain("| API | FastAPI | async |");
    expect(next).toContain("## Key Libraries\n- pydantic");
    expect(next).toContain("- Type hints everywhere\n- No bare except");
    expect(next).not.toContain("Context budget");
    expect(next).not.toContain("Keep to 3-4 rules max");
    expect(next).not.toContain("{{");
  });

  it("gives the same result when run on its own output", async () => {
    const template = await readFile(join(resolveTemplatesDir(), "CLAUDE.md"), "utf-8");
    const once = upgradeClaudeMd(OLD_CLAUDE_MD, template, "swarm");
    expect(once).toBeDefined();
    expect(upgradeClaudeMd(once ?? "", template, "swarm")).toBe(once);
  });

  it("leaves a CLAUDE.md that meto did not write alone", () => {
    expect(upgradeClaudeMd("# my app\n\nSome notes.\n", "# {{PROJECT_NAME}}", "sprint")).toBeUndefined();
  });
});

describe("upgradeEpicAgent", () => {
  it("keeps the epic id, name and domain of an old epic agent", async () => {
    const template = await readFile(
      join(resolveTemplatesDir(), ".claude/agents/epic-agent.md"),
      "utf-8",
    );
    const old = [
      "---",
      "name: meto-epic-E2",
      "memory: false",
      "---",
      "",
      "# Epic Agent — Checkout (E2)",
      "",
      "## Domain Ownership",
      "- **My files:** `src/checkout/`",
    ].join("\n");
    const next = upgradeEpicAgent(old, template);

    expect(next).toContain("name: meto-epic-E2");
    expect(next).toContain("memory: project");
    expect(next).toContain("You implement the slices of Checkout (E2)");
    expect(next).toContain("- Your domain: `src/checkout/`");
    expect(upgradeEpicAgent(next ?? "", template)).toBe(next);
  });

  it("returns undefined when the epic can't be read", () => {
    expect(upgradeEpicAgent("# Something else\n", "x")).toBeUndefined();
  });
});

describe("cleanMemory", () => {
  it("removes the old boilerplate and keeps what the agent wrote", () => {
    const next = cleanMemory(OLD_MEMORY);

    expect(next).not.toContain("Session start checklist");
    expect(next).not.toContain("Read at session start");
    expect(next).not.toContain("Red Flags");
    expect(next).toContain("# Developer Agent Memory — shop-api");
    expect(next).toContain("- `app/routes/orders.py` holds the order endpoints");
    expect(next).toContain("- The test database is shared; reset it in fixtures");
  });

  it("leaves a memory file without boilerplate unchanged", () => {
    const current = "# Developer Memory — shop-api\n\n## Codebase Map\n- a\n\n## Watch Out\n- b\n";
    expect(cleanMemory(current)).toBe(current);
    expect(cleanMemory(cleanMemory(OLD_MEMORY))).toBe(cleanMemory(OLD_MEMORY));
  });
});

describe("upgradeSettings", () => {
  const template = JSON.stringify({
    env: { CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: "1" },
    hooks: {
      SessionStart: [{ matcher: "startup", hooks: [{ type: "command", command: "node handoff" }] }],
      PreCompact: [{ hooks: [{ type: "command", command: "echo keep" }] }],
    },
  });

  it("adds the new hooks and keeps the project's own settings", () => {
    const parsed = JSON.parse(upgradeSettings(OLD_SETTINGS, template) ?? "{}") as {
      env: Record<string, string>;
      permissions: { allow: string[] };
      hooks: Record<string, unknown[]>;
      agents?: unknown;
    };

    expect(parsed.permissions.allow).toEqual(["Bash(pytest *)"]);
    expect(parsed.env.MY_FLAG).toBe("on");
    expect(parsed.hooks).toHaveProperty("SessionStart");
    expect(parsed.hooks).toHaveProperty("PreCompact");
    expect(parsed.hooks.PostToolUse).toHaveLength(1);
    expect(parsed.hooks).not.toHaveProperty("SessionEnd");
    expect(parsed.agents).toBeUndefined();
  });

  it("does not replace a hook event the project already defines", () => {
    const own = JSON.stringify({
      hooks: { SessionStart: [{ hooks: [{ type: "command", command: "my own" }] }] },
    });
    const parsed = JSON.parse(upgradeSettings(own, template) ?? "{}") as {
      hooks: { SessionStart: Array<{ hooks: Array<{ command: string }> }> };
    };
    expect(parsed.hooks.SessionStart[0].hooks[0].command).toBe("my own");
  });

  it("returns undefined for invalid JSON", () => {
    expect(upgradeSettings("{ not json", template)).toBeUndefined();
  });
});

describe("planUpgrade", () => {
  let dir: string;

  async function put(path: string, content: string): Promise<void> {
    const target = join(dir, path);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, content, "utf-8");
  }

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "meto-upgrade-"));
    await put("CLAUDE.md", OLD_CLAUDE_MD);
    await put(
      ".claude/agents/developer-agent.md",
      "---\nname: meto-developer\nmemory: false\n---\n\n# Developer Agent\n\n## Context Budget\n- Max 10 files\n",
    );
    await put(".claude/agent-memory/meto-developer/MEMORY.md", OLD_MEMORY);
    await put(".claude/settings.json", OLD_SETTINGS);
    await put("ai/workflows/session-checkpoint.md", "# Session Checkpoint\n");
    await put("ai/handoff/current.md", "# Handoff\n\n**Agent:** {{AGENT_NAME}}\n");
    await put("ai/tasks/tasks-todo.md", "# Tasks Todo\n\n## [slice-001] -- Keep me\n");
    await put("ai/context/decisions.md", "# Decisions\n\n## D001 — Keep me too\n");
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("plans changes for meto's files only", async () => {
    const actions = await planUpgrade(dir);
    const byPath = new Map(actions.map((a) => [a.path, a]));

    expect(byPath.get("CLAUDE.md")?.kind).toBe("replace");
    expect(byPath.get(".claude/agents/developer-agent.md")?.content).toContain("memory: project");
    expect(byPath.get(".claude/agent-memory/meto-developer/MEMORY.md")?.kind).toBe("clean");
    expect(byPath.get(".claude/settings.json")?.kind).toBe("merge");
    expect(byPath.get("ai/workflows/session-checkpoint.md")?.kind).toBe("remove");
    expect(byPath.get("ai/handoff/current.md")?.kind).toBe("replace");
    expect(byPath.has(".claude/skills/meto/.claude-plugin/plugin.json")).toBe(true);

    // Not installed, so not the upgrade's job: the normal audit creates missing files
    expect(byPath.has(".claude/agents/pm-agent.md")).toBe(false);
    // The project's own files
    expect(byPath.has("ai/tasks/tasks-todo.md")).toBe(false);
    expect(byPath.has("ai/context/decisions.md")).toBe(false);
  });

  it("applies cleanly and then has nothing left to do", async () => {
    for (const action of await planUpgrade(dir)) {
      await applyUpgradeAction(dir, action);
    }

    expect(await planUpgrade(dir)).toEqual([]);
    await expect(stat(join(dir, "ai/workflows/session-checkpoint.md"))).rejects.toThrow();
    expect(await readFile(join(dir, "ai/tasks/tasks-todo.md"), "utf-8")).toContain("Keep me");
    expect(await readFile(join(dir, "ai/context/decisions.md"), "utf-8")).toContain("Keep me too");
    expect(await readFile(join(dir, "CLAUDE.md"), "utf-8")).toContain("An API for small shops.");
  });

  it("adds the rubric skill, and the swarm files only to a swarm project", async () => {
    const sprint = new Map((await planUpgrade(dir)).map((a) => [a.path, a]));
    expect(sprint.get(".claude/skills/meto-rubric/SKILL.md")?.kind).toBe("add");
    expect(sprint.has(".claude/workflows/meto-swarm.js")).toBe(false);
    expect(sprint.has(".claude/skills/meto-swarm-guide/SKILL.md")).toBe(false);
    // No manifest to detect a stack from, so no stack rules are offered
    expect(sprint.has(".claude/rules/stack.md")).toBe(false);

    await put("ai/swarm/SWARM_AWARENESS.md", "# SWARM_AWARENESS\n");
    await put("ai/workflows/swarm-workflow.md", "# Swarm Workflow\n");
    const swarm = new Map((await planUpgrade(dir)).map((a) => [a.path, a]));
    expect(swarm.get(".claude/workflows/meto-swarm.js")?.kind).toBe("add");
    expect(swarm.get(".claude/skills/meto-swarm-guide/SKILL.md")?.kind).toBe("add");
    expect(swarm.get("ai/workflows/swarm-workflow.md")?.kind).toBe("remove");
  });

  it("adds stack rules when the stack is recognised and leaves existing ones alone", async () => {
    await put("go.mod", "module example.com/shop\n\ngo 1.22\n");
    const rules = (await planUpgrade(dir)).find((a) => a.path === ".claude/rules/stack.md");
    expect(rules?.kind).toBe("add");
    expect(rules?.content).toContain('"**/*.go"');

    await put(".claude/rules/stack.md", "# my own rules\n");
    const again = await planUpgrade(dir);
    expect(again.some((a) => a.path === ".claude/rules/stack.md")).toBe(false);
  });

  it("leaves a filled-in handoff alone", async () => {
    await put("ai/handoff/current.md", "# Handoff\n\n**Active slice:** slice-004 — in-testing\n");
    const actions = await planUpgrade(dir);
    expect(actions.some((a) => a.path === "ai/handoff/current.md")).toBe(false);
  });
});
