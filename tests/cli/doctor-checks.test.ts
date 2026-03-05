import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  checkRequiredFiles,
  checkContextFilesNotEmpty,
  checkBoardFileFormat,
  checkEpicsFileHasContent,
  checkAgentDefinitions,
  checkInProgressLimit,
  checkNoOrphanTasks,
  extractSliceIds,
  runHealthChecks,
} from "../../src/cli/doctor-checks.js";

describe("extractSliceIds", () => {
  it("extracts slice IDs from ## [slice-NNN] headings", () => {
    const content = [
      "# Tasks",
      "## [slice-001] -- Some task",
      "Content here",
      "## [slice-042] -- Another task",
    ].join("\n");
    expect(extractSliceIds(content)).toEqual(["[slice-001]", "[slice-042]"]);
  });

  it("returns empty array when no slice headings exist", () => {
    expect(extractSliceIds("# Just a heading\nSome content")).toEqual([]);
  });
});

describe("checkRequiredFiles", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = join(tmpdir(), `meto-doctor-req-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("returns fail for missing required files", async () => {
    const results = await checkRequiredFiles(tempDir);
    const failures = results.filter((r) => r.status === "fail");
    // All 11 required files should be missing
    expect(failures.length).toBe(11);
    expect(failures[0].message).toContain("Missing required file");
  });

  it("returns pass for existing required files", async () => {
    // Create all required files
    const requiredFiles = [
      "CLAUDE.md",
      "ai/context/product-vision.md",
      "ai/context/tech-stack.md",
      "ai/context/decisions.md",
      "ai/backlog/epics.md",
      "ai/tasks/tasks-backlog.md",
      "ai/tasks/tasks-todo.md",
      "ai/tasks/tasks-in-progress.md",
      "ai/tasks/tasks-in-testing.md",
      "ai/tasks/tasks-done.md",
      "ai/workflows/definition-of-done.md",
    ];

    for (const file of requiredFiles) {
      const filePath = join(tempDir, file);
      await mkdir(join(filePath, ".."), { recursive: true });
      await writeFile(filePath, "# Content\n");
    }

    const results = await checkRequiredFiles(tempDir);
    const passes = results.filter((r) => r.status === "pass");
    expect(passes.length).toBe(11);
  });

  it("returns mix of pass and fail for partial setup", async () => {
    await mkdir(join(tempDir, "ai", "tasks"), { recursive: true });
    await writeFile(join(tempDir, "CLAUDE.md"), "# CLAUDE\n");
    await writeFile(join(tempDir, "ai/tasks/tasks-todo.md"), "# Todo\n");

    const results = await checkRequiredFiles(tempDir);
    const passes = results.filter((r) => r.status === "pass");
    const failures = results.filter((r) => r.status === "fail");
    expect(passes.length).toBe(2);
    expect(failures.length).toBe(9);
  });
});

describe("checkContextFilesNotEmpty", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = join(tmpdir(), `meto-doctor-ctx-${Date.now()}`);
    await mkdir(join(tempDir, "ai", "context"), { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("returns pass when context files have more than 2 lines", async () => {
    await writeFile(
      join(tempDir, "ai/context/product-vision.md"),
      "# Vision\nLine 1\nLine 2\nLine 3\n",
    );
    await writeFile(
      join(tempDir, "ai/context/tech-stack.md"),
      "# Stack\nLine 1\nLine 2\nLine 3\n",
    );

    const results = await checkContextFilesNotEmpty(tempDir);
    expect(results.every((r) => r.status === "pass")).toBe(true);
  });

  it("returns warn when context files have 2 or fewer lines", async () => {
    await writeFile(
      join(tempDir, "ai/context/product-vision.md"),
      "# Vision\n",
    );
    await writeFile(join(tempDir, "ai/context/tech-stack.md"), "# Stack\n");

    const results = await checkContextFilesNotEmpty(tempDir);
    expect(results.every((r) => r.status === "warn")).toBe(true);
    expect(results[0].message).toContain("non-empty lines");
  });

  it("skips files that do not exist", async () => {
    // No files created -- should return empty results
    await rm(join(tempDir, "ai/context/product-vision.md"), { force: true });
    const results = await checkContextFilesNotEmpty(tempDir);
    expect(results.length).toBe(0);
  });
});

describe("checkBoardFileFormat", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = join(tmpdir(), `meto-doctor-board-${Date.now()}`);
    await mkdir(join(tempDir, "ai", "tasks"), { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("returns pass when board files start with # heading", async () => {
    const files = [
      "tasks-backlog.md",
      "tasks-todo.md",
      "tasks-in-progress.md",
      "tasks-in-testing.md",
      "tasks-done.md",
    ];

    for (const file of files) {
      await writeFile(
        join(tempDir, "ai/tasks", file),
        `# ${file.replace(".md", "")}\n\nContent\n`,
      );
    }

    const results = await checkBoardFileFormat(tempDir);
    expect(results.every((r) => r.status === "pass")).toBe(true);
    expect(results.length).toBe(5);
  });

  it("returns warn when a board file does not start with # heading", async () => {
    await writeFile(
      join(tempDir, "ai/tasks/tasks-todo.md"),
      "No heading here\nJust text\n",
    );

    const results = await checkBoardFileFormat(tempDir);
    const warns = results.filter((r) => r.status === "warn");
    expect(warns.length).toBe(1);
    expect(warns[0].message).toContain("does not start with a # heading");
  });
});

describe("checkEpicsFileHasContent", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = join(tmpdir(), `meto-doctor-epics-${Date.now()}`);
    await mkdir(join(tempDir, "ai", "backlog"), { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("returns pass when epics file has ## E heading", async () => {
    await writeFile(
      join(tempDir, "ai/backlog/epics.md"),
      "# Epics\n\n## E1 -- Core MVP\nDescription\n",
    );

    const results = await checkEpicsFileHasContent(tempDir);
    expect(results[0].status).toBe("pass");
  });

  it("returns warn when epics file has no ## E heading", async () => {
    await writeFile(
      join(tempDir, "ai/backlog/epics.md"),
      "# Epics\n\nNothing here yet\n",
    );

    const results = await checkEpicsFileHasContent(tempDir);
    expect(results[0].status).toBe("warn");
    expect(results[0].message).toContain("does not contain any ## E headings");
  });

  it("returns empty results when epics file does not exist", async () => {
    const results = await checkEpicsFileHasContent(tempDir);
    expect(results.length).toBe(0);
  });
});

describe("checkAgentDefinitions", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = join(tmpdir(), `meto-doctor-agents-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("returns pass when all agent files exist", async () => {
    const agentsDir = join(tempDir, ".claude", "agents");
    await mkdir(agentsDir, { recursive: true });
    await writeFile(join(agentsDir, "pm-agent.md"), "# PM\n");
    await writeFile(join(agentsDir, "developer-agent.md"), "# Dev\n");
    await writeFile(join(agentsDir, "tester-agent.md"), "# Test\n");

    const results = await checkAgentDefinitions(tempDir);
    expect(results.every((r) => r.status === "pass")).toBe(true);
    expect(results.length).toBe(3);
  });

  it("returns fail when agent files are missing", async () => {
    const agentsDir = join(tempDir, ".claude", "agents");
    await mkdir(agentsDir, { recursive: true });
    // Only create one agent
    await writeFile(join(agentsDir, "pm-agent.md"), "# PM\n");

    const results = await checkAgentDefinitions(tempDir);
    const passes = results.filter((r) => r.status === "pass");
    const failures = results.filter((r) => r.status === "fail");
    expect(passes.length).toBe(1);
    expect(failures.length).toBe(2);
  });

  it("returns fail for all agents when .claude/agents/ does not exist", async () => {
    const results = await checkAgentDefinitions(tempDir);
    expect(results.every((r) => r.status === "fail")).toBe(true);
    expect(results.length).toBe(3);
    expect(results[0].message).toContain("Missing agent definition");
  });
});

describe("checkInProgressLimit", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = join(tmpdir(), `meto-doctor-wip-${Date.now()}`);
    await mkdir(join(tempDir, "ai", "tasks"), { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("returns pass when 0 tasks in progress", async () => {
    await writeFile(
      join(tempDir, "ai/tasks/tasks-in-progress.md"),
      "# Tasks -- In Progress\n\n---\n",
    );

    const results = await checkInProgressLimit(tempDir);
    expect(results[0].status).toBe("pass");
    expect(results[0].message).toContain("0 task(s)");
  });

  it("returns pass when exactly 1 task in progress", async () => {
    await writeFile(
      join(tempDir, "ai/tasks/tasks-in-progress.md"),
      "# Tasks -- In Progress\n\n## [slice-001] -- Some task\nContent\n",
    );

    const results = await checkInProgressLimit(tempDir);
    expect(results[0].status).toBe("pass");
    expect(results[0].message).toContain("1 task(s)");
  });

  it("returns warn when more than 1 task in progress", async () => {
    await writeFile(
      join(tempDir, "ai/tasks/tasks-in-progress.md"),
      [
        "# Tasks -- In Progress",
        "",
        "## [slice-001] -- First task",
        "Content",
        "",
        "## [slice-002] -- Second task",
        "Content",
      ].join("\n"),
    );

    const results = await checkInProgressLimit(tempDir);
    expect(results[0].status).toBe("warn");
    expect(results[0].message).toBe(
      "WIP limit exceeded: 2 tasks in progress, expected max 1.",
    );
  });
});

describe("checkNoOrphanTasks", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = join(tmpdir(), `meto-doctor-orphan-${Date.now()}`);
    await mkdir(join(tempDir, "ai", "tasks"), { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("returns pass when all active tasks have backlog entries", async () => {
    await writeFile(
      join(tempDir, "ai/tasks/tasks-backlog.md"),
      "# Backlog\n\n## [slice-001] -- Task\n\n## [slice-002] -- Task\n",
    );
    await writeFile(
      join(tempDir, "ai/tasks/tasks-in-progress.md"),
      "# In Progress\n\n## [slice-001] -- Task\n",
    );
    await writeFile(
      join(tempDir, "ai/tasks/tasks-in-testing.md"),
      "# In Testing\n\n## [slice-002] -- Task\n",
    );

    const results = await checkNoOrphanTasks(tempDir);
    expect(results[0].status).toBe("pass");
    expect(results[0].message).toContain("All active tasks have backlog entries");
  });

  it("returns warn when a task is not in the backlog", async () => {
    await writeFile(
      join(tempDir, "ai/tasks/tasks-backlog.md"),
      "# Backlog\n\n## [slice-001] -- Task\n",
    );
    await writeFile(
      join(tempDir, "ai/tasks/tasks-in-progress.md"),
      "# In Progress\n\n## [slice-099] -- Orphan\n",
    );
    await writeFile(
      join(tempDir, "ai/tasks/tasks-in-testing.md"),
      "# In Testing\n",
    );

    const results = await checkNoOrphanTasks(tempDir);
    const warns = results.filter((r) => r.status === "warn");
    expect(warns.length).toBe(1);
    expect(warns[0].message).toContain("[slice-099]");
    expect(warns[0].message).toContain("tasks-in-progress.md");
  });

  it("returns pass when no active tasks exist", async () => {
    await writeFile(
      join(tempDir, "ai/tasks/tasks-backlog.md"),
      "# Backlog\n\n## [slice-001] -- Task\n",
    );
    await writeFile(
      join(tempDir, "ai/tasks/tasks-in-progress.md"),
      "# In Progress\n",
    );
    await writeFile(
      join(tempDir, "ai/tasks/tasks-in-testing.md"),
      "# In Testing\n",
    );

    const results = await checkNoOrphanTasks(tempDir);
    expect(results[0].status).toBe("pass");
    expect(results[0].message).toContain("No active tasks to check");
  });

  it("detects orphans in both in-progress and in-testing", async () => {
    await writeFile(
      join(tempDir, "ai/tasks/tasks-backlog.md"),
      "# Backlog\n",
    );
    await writeFile(
      join(tempDir, "ai/tasks/tasks-in-progress.md"),
      "# In Progress\n\n## [slice-010] -- Orphan 1\n",
    );
    await writeFile(
      join(tempDir, "ai/tasks/tasks-in-testing.md"),
      "# In Testing\n\n## [slice-020] -- Orphan 2\n",
    );

    const results = await checkNoOrphanTasks(tempDir);
    const warns = results.filter((r) => r.status === "warn");
    expect(warns.length).toBe(2);
    expect(warns[0].message).toContain("[slice-010]");
    expect(warns[1].message).toContain("[slice-020]");
  });
});

describe("runHealthChecks", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = join(tmpdir(), `meto-doctor-all-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("returns results from all check functions", async () => {
    // Empty project -- should get failures for required files and agents
    const results = await runHealthChecks(tempDir);
    expect(results.length).toBeGreaterThan(0);
    // At minimum: 11 required file checks + 3 agent checks = 14 fail results
    const failures = results.filter((r) => r.status === "fail");
    expect(failures.length).toBeGreaterThanOrEqual(14);
  });

  it("returns all passes for a well-formed project", async () => {
    // Create all required structures
    await mkdir(join(tempDir, "ai", "context"), { recursive: true });
    await mkdir(join(tempDir, "ai", "backlog"), { recursive: true });
    await mkdir(join(tempDir, "ai", "tasks"), { recursive: true });
    await mkdir(join(tempDir, "ai", "workflows"), { recursive: true });
    await mkdir(join(tempDir, ".claude", "agents"), { recursive: true });

    await writeFile(join(tempDir, "CLAUDE.md"), "# CLAUDE\n");
    await writeFile(
      join(tempDir, "ai/context/product-vision.md"),
      "# Vision\nLine 1\nLine 2\nLine 3\n",
    );
    await writeFile(
      join(tempDir, "ai/context/tech-stack.md"),
      "# Stack\nLine 1\nLine 2\nLine 3\n",
    );
    await writeFile(
      join(tempDir, "ai/context/decisions.md"),
      "# Decisions\n",
    );
    await writeFile(
      join(tempDir, "ai/backlog/epics.md"),
      "# Epics\n\n## E1 -- Core\nDescription\n",
    );
    await writeFile(
      join(tempDir, "ai/tasks/tasks-backlog.md"),
      "# Tasks -- Backlog\n",
    );
    await writeFile(
      join(tempDir, "ai/tasks/tasks-todo.md"),
      "# Tasks -- Todo\n",
    );
    await writeFile(
      join(tempDir, "ai/tasks/tasks-in-progress.md"),
      "# Tasks -- In Progress\n",
    );
    await writeFile(
      join(tempDir, "ai/tasks/tasks-in-testing.md"),
      "# Tasks -- In Testing\n",
    );
    await writeFile(
      join(tempDir, "ai/tasks/tasks-done.md"),
      "# Tasks -- Done\n",
    );
    await writeFile(
      join(tempDir, "ai/workflows/definition-of-done.md"),
      "# Definition of Done\n",
    );
    await writeFile(join(tempDir, ".claude/agents/pm-agent.md"), "# PM\n");
    await writeFile(
      join(tempDir, ".claude/agents/developer-agent.md"),
      "# Dev\n",
    );
    await writeFile(
      join(tempDir, ".claude/agents/tester-agent.md"),
      "# Tester\n",
    );

    const results = await runHealthChecks(tempDir);
    const failures = results.filter((r) => r.status === "fail");
    const warns = results.filter((r) => r.status === "warn");
    expect(failures.length).toBe(0);
    expect(warns.length).toBe(0);
    expect(results.every((r) => r.status === "pass")).toBe(true);
  });
});
