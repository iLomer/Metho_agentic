import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  extractLastSlices,
  buildRubricChecks,
  type RubricSliceResult,
} from "../../src/cli/audit/rubric-check.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function makeDir(base: string, ...parts: string[]): Promise<string> {
  const p = join(base, ...parts);
  await mkdir(p, { recursive: true });
  return p;
}

async function makeFile(path: string, content = ""): Promise<void> {
  await writeFile(path, content, "utf-8");
}

// ---------------------------------------------------------------------------
// extractLastSlices
// ---------------------------------------------------------------------------

describe("extractLastSlices", () => {
  it("returns empty array when tasks-done.md is missing", async () => {
    const dir = await makeDir(tmpdir(), `rubric-test-${Date.now()}`);
    try {
      const result = await extractLastSlices(dir, 5);
      expect(result).toEqual([]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("extracts slice IDs from heading lines", async () => {
    const dir = await makeDir(tmpdir(), `rubric-test-${Date.now()}`);
    try {
      const tasksDir = join(dir, "ai", "tasks");
      await mkdir(tasksDir, { recursive: true });
      const content = [
        "# Tasks -- Done",
        "",
        "## [slice-087] -- Agent prompt updates",
        "**Epic:** E23",
        "",
        "## [slice-086] -- CLAUDE.md template update",
        "**Epic:** E23",
        "",
        "## [slice-085] -- Sprint contract template",
        "**Epic:** E23",
        "",
        "## [slice-001] -- Initialize CLI",
        "**Epic:** E1",
      ].join("\n");
      await makeFile(join(tasksDir, "tasks-done.md"), content);

      const result = await extractLastSlices(dir, 5);
      // Should return last 5 (or all 4 here) in document order (top = most recent)
      expect(result).toEqual(["slice-087", "slice-086", "slice-085", "slice-001"]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("returns only the top N slices when more exist", async () => {
    const dir = await makeDir(tmpdir(), `rubric-test-${Date.now()}`);
    try {
      const tasksDir = join(dir, "ai", "tasks");
      await mkdir(tasksDir, { recursive: true });
      const ids = ["091", "090", "089", "088", "087", "086", "085"];
      const content = ids
        .map((id) => `## [slice-${id}] -- Some slice\n**Epic:** E24\n`)
        .join("\n");
      await makeFile(join(tasksDir, "tasks-done.md"), content);

      const result = await extractLastSlices(dir, 3);
      expect(result).toEqual(["slice-091", "slice-090", "slice-089"]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("handles malformed lines gracefully (no crash)", async () => {
    const dir = await makeDir(tmpdir(), `rubric-test-${Date.now()}`);
    try {
      const tasksDir = join(dir, "ai", "tasks");
      await mkdir(tasksDir, { recursive: true });
      const content = "## Not a slice heading\n## [slice-010] -- Valid\n";
      await makeFile(join(tasksDir, "tasks-done.md"), content);

      const result = await extractLastSlices(dir, 5);
      expect(result).toEqual(["slice-010"]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// buildRubricChecks
// ---------------------------------------------------------------------------

describe("buildRubricChecks", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await makeDir(tmpdir(), `rubric-build-${Date.now()}`);
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("reports missing contract and score files as fail", async () => {
    const results = await buildRubricChecks(dir, ["slice-042"]);
    const contractCheck = results.find(
      (r) => r.sliceId === "slice-042" && r.checkType === "contract",
    );
    const scoreCheck = results.find(
      (r) => r.sliceId === "slice-042" && r.checkType === "score",
    );
    expect(contractCheck?.status).toBe("fail");
    expect(scoreCheck?.status).toBe("fail");
  });

  it("reports present contract file as pass", async () => {
    await mkdir(join(dir, "ai", "contracts"), { recursive: true });
    await makeFile(join(dir, "ai", "contracts", "slice-042-contract.md"), "# Contract");

    const results = await buildRubricChecks(dir, ["slice-042"]);
    const contractCheck = results.find(
      (r) => r.sliceId === "slice-042" && r.checkType === "contract",
    );
    expect(contractCheck?.status).toBe("pass");
  });

  it("reports present score file as pass", async () => {
    await mkdir(join(dir, "ai", "rubric"), { recursive: true });
    await makeFile(join(dir, "ai", "rubric", "slice-042-score.md"), "# Score");

    const results = await buildRubricChecks(dir, ["slice-042"]);
    const scoreCheck = results.find(
      (r) => r.sliceId === "slice-042" && r.checkType === "score",
    );
    expect(scoreCheck?.status).toBe("pass");
  });

  it("returns results for multiple slices", async () => {
    const results = await buildRubricChecks(dir, ["slice-010", "slice-011"]);
    const sliceIds = [...new Set(results.map((r) => r.sliceId))];
    expect(sliceIds).toContain("slice-010");
    expect(sliceIds).toContain("slice-011");
  });

  it("returns empty array for empty slice list", async () => {
    const results = await buildRubricChecks(dir, []);
    expect(results).toEqual([]);
  });

  it("includes fix instruction message for missing contract", async () => {
    const results = await buildRubricChecks(dir, ["slice-042"]);
    const contractCheck = results.find(
      (r) => r.sliceId === "slice-042" && r.checkType === "contract",
    );
    expect(contractCheck?.fixInstruction).toContain("ai/contracts/slice-042-contract.md");
  });

  it("includes fix instruction message for missing score", async () => {
    const results = await buildRubricChecks(dir, ["slice-042"]);
    const scoreCheck = results.find(
      (r) => r.sliceId === "slice-042" && r.checkType === "score",
    );
    expect(scoreCheck?.fixInstruction).toContain("ai/rubric/slice-042-score.md");
  });
});

// ---------------------------------------------------------------------------
// RubricSliceResult type shape
// ---------------------------------------------------------------------------

describe("RubricSliceResult type shape", () => {
  it("has required fields: sliceId, checkType, status, message, fixInstruction", () => {
    const example: RubricSliceResult = {
      sliceId: "slice-001",
      checkType: "contract",
      status: "pass",
      message: "Found ai/contracts/slice-001-contract.md",
      fixInstruction: undefined,
    };
    expect(example.sliceId).toBe("slice-001");
    expect(example.checkType).toBe("contract");
    expect(example.status).toBe("pass");
  });
});
