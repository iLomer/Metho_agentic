import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { swarmFileExists, displayDashboard } from "../../src/cli/status.js";
import type { SwarmState } from "../../src/cli/swarm-parser.js";

// Mock clack for dashboard display tests
vi.mock("@clack/prompts", () => ({
  log: {
    success: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
  },
  note: vi.fn(),
  intro: vi.fn(),
  outro: vi.fn(),
}));

import * as p from "@clack/prompts";

describe("swarmFileExists", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = join(tmpdir(), `meto-status-test-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("returns true when SWARM_AWARENESS.md exists", async () => {
    await mkdir(join(tempDir, "ai", "swarm"), { recursive: true });
    await writeFile(
      join(tempDir, "ai", "swarm", "SWARM_AWARENESS.md"),
      "# swarm",
    );
    const result = await swarmFileExists(tempDir);
    expect(result).toBe(true);
  });

  it("returns false when SWARM_AWARENESS.md does not exist", async () => {
    await mkdir(join(tempDir, "ai", "tasks"), { recursive: true });
    const result = await swarmFileExists(tempDir);
    expect(result).toBe(false);
  });

  it("returns false when ai/swarm/ directory does not exist", async () => {
    const result = await swarmFileExists(tempDir);
    expect(result).toBe(false);
  });
});

describe("displayDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("displays header with project name, mode, and duration", () => {
    const state: SwarmState = {
      meta: {
        projectName: "TestProject",
        mode: "swarm",
        started: "2020-01-01",
        totalEpics: 2,
        totalTasks: 8,
        acPassed: 3,
        acTotal: 8,
      },
      epics: [
        {
          id: "E1",
          name: "Auth",
          agent: "@meto-epic-E1",
          status: "complete",
          tasksDone: 4,
          blocker: "none",
        },
        {
          id: "E2",
          name: "Dashboard",
          agent: "@meto-epic-E2",
          status: "on-track",
          tasksDone: 2,
          blocker: "none",
        },
      ],
      checkpoints: [],
      conflicts: [],
    };

    displayDashboard(state);

    expect(p.note).toHaveBeenCalledWith(
      expect.stringContaining("Project: TestProject"),
      "Swarm Dashboard",
    );
    expect(p.note).toHaveBeenCalledWith(
      expect.stringContaining("Mode: swarm"),
      "Swarm Dashboard",
    );
  });

  it("uses correct clack functions per epic status", () => {
    const state: SwarmState = {
      meta: {
        projectName: "Test",
        mode: "swarm",
        started: "",
        totalEpics: 3,
        totalTasks: 9,
        acPassed: 4,
        acTotal: 9,
      },
      epics: [
        {
          id: "E1",
          name: "Done epic",
          agent: "@agent",
          status: "complete",
          tasksDone: 3,
          blocker: "none",
        },
        {
          id: "E2",
          name: "Active epic",
          agent: "@agent",
          status: "on-track",
          tasksDone: 2,
          blocker: "none",
        },
        {
          id: "E3",
          name: "Stuck epic",
          agent: "@agent",
          status: "blocked",
          tasksDone: 1,
          blocker: "missing API key",
        },
      ],
      checkpoints: [],
      conflicts: [],
    };

    displayDashboard(state);

    // Complete epic uses p.log.success
    expect(p.log.success).toHaveBeenCalledWith(
      expect.stringContaining("E1 -- Done epic"),
    );

    // On-track epic uses p.log.info
    expect(p.log.info).toHaveBeenCalledWith(
      expect.stringContaining("E2 -- Active epic"),
    );

    // Blocked epic uses p.log.error (for the epic line)
    expect(p.log.error).toHaveBeenCalledWith(
      expect.stringContaining("E3 -- Stuck epic"),
    );

    // Blocker detail uses p.log.error
    expect(p.log.error).toHaveBeenCalledWith(
      expect.stringContaining("E3 blocker: missing API key"),
    );
  });

  it("shows acceptance criteria summary", () => {
    const state: SwarmState = {
      meta: {
        projectName: "Test",
        mode: "swarm",
        started: "",
        totalEpics: 1,
        totalTasks: 5,
        acPassed: 3,
        acTotal: 10,
      },
      epics: [
        {
          id: "E1",
          name: "Test",
          agent: "@agent",
          status: "on-track",
          tasksDone: 1,
          blocker: "none",
        },
      ],
      checkpoints: [],
      conflicts: [],
    };

    displayDashboard(state);

    expect(p.note).toHaveBeenCalledWith(
      "3 of 10 passed",
      "Acceptance Criteria",
    );
  });

  it("shows 'No blockers' when no epics are blocked", () => {
    const state: SwarmState = {
      meta: {
        projectName: "Test",
        mode: "swarm",
        started: "",
        totalEpics: 1,
        totalTasks: 3,
        acPassed: 0,
        acTotal: 3,
      },
      epics: [
        {
          id: "E1",
          name: "Test",
          agent: "@agent",
          status: "on-track",
          tasksDone: 0,
          blocker: "none",
        },
      ],
      checkpoints: [],
      conflicts: [],
    };

    displayDashboard(state);

    expect(p.log.success).toHaveBeenCalledWith("No blockers");
  });

  it("displays pending conflicts", () => {
    const state: SwarmState = {
      meta: {
        projectName: "Test",
        mode: "swarm",
        started: "",
        totalEpics: 2,
        totalTasks: 6,
        acPassed: 0,
        acTotal: 6,
      },
      epics: [
        {
          id: "E1",
          name: "A",
          agent: "@agent",
          status: "on-track",
          tasksDone: 0,
          blocker: "none",
        },
        {
          id: "E2",
          name: "B",
          agent: "@agent",
          status: "on-track",
          tasksDone: 0,
          blocker: "none",
        },
      ],
      checkpoints: [],
      conflicts: [
        {
          date: "2026-03-03",
          file: "src/types.ts",
          agents: "E1 vs E2",
          resolution: "pending",
        },
      ],
    };

    displayDashboard(state);

    expect(p.log.warning).toHaveBeenCalledWith(
      expect.stringContaining("src/types.ts"),
    );
    expect(p.log.warning).toHaveBeenCalledWith(
      expect.stringContaining("E1 vs E2"),
    );
  });

  it("omits conflicts section when all are resolved", () => {
    const state: SwarmState = {
      meta: {
        projectName: "Test",
        mode: "swarm",
        started: "",
        totalEpics: 1,
        totalTasks: 3,
        acPassed: 0,
        acTotal: 3,
      },
      epics: [
        {
          id: "E1",
          name: "Test",
          agent: "@agent",
          status: "on-track",
          tasksDone: 0,
          blocker: "none",
        },
      ],
      checkpoints: [],
      conflicts: [
        {
          date: "2026-03-03",
          file: "src/types.ts",
          agents: "E1 vs E2",
          resolution: "resolved",
        },
      ],
    };

    displayDashboard(state);

    // p.log.warning should not be called for conflicts (only possibly for not-started epics)
    const warningCalls = vi.mocked(p.log.warning).mock.calls;
    const conflictWarnings = warningCalls.filter(
      (call) => typeof call[0] === "string" && call[0].includes("Conflict:"),
    );
    expect(conflictWarnings).toHaveLength(0);
  });

  it("handles empty epics list", () => {
    const state: SwarmState = {
      meta: {
        projectName: "Empty",
        mode: "swarm",
        started: "",
        totalEpics: 0,
        totalTasks: 0,
        acPassed: 0,
        acTotal: 0,
      },
      epics: [],
      checkpoints: [],
      conflicts: [],
    };

    displayDashboard(state);

    expect(p.log.warning).toHaveBeenCalledWith(
      "No epics found in swarm state.",
    );
  });
});
