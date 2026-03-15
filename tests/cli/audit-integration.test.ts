/**
 * Integration tests for the audit command.
 *
 * These tests exercise the real AUDIT_BLUEPRINT with the real scanner
 * against temp directories, simulating the three key scenarios:
 * - Empty directory (Layer 0 failures, no crash)
 * - Fully scaffolded project (all layers pass)
 * - Partial project (correct gating behavior)
 *
 * We do NOT test the interactive fixer or the CLI entry point (runAudit)
 * because those require stdin and process.exit mocking.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { AUDIT_BLUEPRINT } from "../../src/cli/audit/blueprint.js";
import {
  scanLayer,
  skipLayer,
  layerPassed,
} from "../../src/cli/audit/scanner.js";
import type { LayerScanResult } from "../../src/cli/audit/scanner.js";

// ---------------------------------------------------------------------------
// Helper: run all layers with gating logic (mirrors index.ts runAudit)
// ---------------------------------------------------------------------------

async function auditProject(projectDir: string): Promise<LayerScanResult[]> {
  const results: LayerScanResult[] = [];
  let previousPassed = true;

  for (const layer of AUDIT_BLUEPRINT) {
    // Layer 0 is informational — never gates. All other layers are gated.
    if (!previousPassed && layer.id > 1) {
      results.push(
        skipLayer(layer, `Layer ${layer.id - 1} did not pass`),
      );
      continue;
    }

    const scanResult = await scanLayer(projectDir, layer);
    results.push(scanResult);
    // Layer 0 never blocks — always treat as passed for gating
    previousPassed = layer.id === 0 ? true : layerPassed(scanResult);
  }

  return results;
}

// ---------------------------------------------------------------------------
// Scenario 1: Empty directory
// ---------------------------------------------------------------------------

describe("audit integration -- empty directory", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = join(tmpdir(), `meto-audit-empty-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("does not crash on an empty directory", async () => {
    const results = await auditProject(tempDir);
    expect(results).toHaveLength(4);
  });

  it("Layer 0 fails with all 2 expectations failing", async () => {
    const results = await auditProject(tempDir);
    const layer0 = results[0];

    expect(layer0.skipped).toBe(false);
    expect(layer0.results).toHaveLength(2);
    expect(layer0.results.every((r) => r.status === "fail")).toBe(true);
  });

  it("Layers 2-3 are skipped due to Layer 1 gating (Layer 0 is informational)", async () => {
    const results = await auditProject(tempDir);

    // Layer 1 is scanned (Layer 0 never gates) but fails
    expect(results[1].skipped).toBe(false);

    for (let i = 2; i <= 3; i++) {
      expect(results[i].skipped).toBe(true);
      expect(results[i].skipReason).toContain("did not pass");
      expect(results[i].results.every((r) => r.status === "skip")).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// Scenario 2: Fully scaffolded project
// ---------------------------------------------------------------------------

describe("audit integration -- fully scaffolded project", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = join(tmpdir(), `meto-audit-full-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  async function scaffoldFullProject(dir: string): Promise<void> {
    // Layer 0: prerequisites
    await mkdir(join(dir, ".git"), { recursive: true });
    await mkdir(join(dir, "src"), { recursive: true });

    // Layer 1: methodology
    await writeFile(
      join(dir, "CLAUDE.md"),
      "# Project\n\n## Commit Format\nfeat(scope): description\n",
    );
    await mkdir(join(dir, "ai", "context"), { recursive: true });
    await writeFile(join(dir, "ai/context/product-vision.md"), "# Vision\n");
    await writeFile(join(dir, "ai/context/tech-stack.md"), "# Stack\n");
    await writeFile(join(dir, "ai/context/decisions.md"), "# Decisions\n");
    await mkdir(join(dir, "ai", "tasks"), { recursive: true });
    await writeFile(join(dir, "ai/tasks/tasks-backlog.md"), "# Backlog\n");
    await writeFile(join(dir, "ai/tasks/tasks-todo.md"), "# Todo\n");
    await writeFile(join(dir, "ai/tasks/tasks-in-progress.md"), "# WIP\n");
    await writeFile(join(dir, "ai/tasks/tasks-in-testing.md"), "# Testing\n");
    await writeFile(join(dir, "ai/tasks/tasks-done.md"), "# Done\n");
    await mkdir(join(dir, "ai", "workflows"), { recursive: true });
    await writeFile(
      join(dir, "ai/workflows/definition-of-done.md"),
      "# Definition of Done\n",
    );
    await writeFile(
      join(dir, "ai/workflows/commit-conventions.md"),
      "# Commit Conventions\n",
    );

    // Layer 2: agents
    await mkdir(join(dir, ".claude", "agents"), { recursive: true });
    await writeFile(
      join(dir, ".claude/settings.json"),
      JSON.stringify({ agents: {} }),
    );
    await writeFile(
      join(dir, ".claude/agents/pm-agent.md"),
      "# PM Agent\n\nReferences definition-of-done and agent-memory/meto-pm\n",
    );
    await writeFile(
      join(dir, ".claude/agents/developer-agent.md"),
      "# Developer Agent\n\nReferences commit conventions and agent-memory/meto-developer and code-guidelines\n",
    );
    await writeFile(
      join(dir, ".claude/agents/tester-agent.md"),
      "# Tester Agent\n\nReferences definition-of-done and agent-memory/meto-tester and code-guidelines\n",
    );
    await mkdir(join(dir, ".claude/agent-memory/meto-pm"), { recursive: true });
    await mkdir(join(dir, ".claude/agent-memory/meto-developer"), {
      recursive: true,
    });
    await mkdir(join(dir, ".claude/agent-memory/meto-tester"), {
      recursive: true,
    });

    // Layer 3: governance (content already embedded above)
    await writeFile(
      join(dir, "ai/workflows/session-checkpoint.md"),
      "# Session Checkpoint\n",
    );
    await writeFile(
      join(dir, "ai/workflows/code-guidelines.md"),
      "# Code Guidelines\n",
    );
  }

  it("all 4 layers pass", async () => {
    await scaffoldFullProject(tempDir);
    const results = await auditProject(tempDir);

    expect(results).toHaveLength(4);
    for (const layer of results) {
      expect(layer.skipped).toBe(false);
      const failed = layer.results.filter((r) => r.status === "fail");
      expect(failed).toHaveLength(0);
    }
  });

  it("no layers are skipped", async () => {
    await scaffoldFullProject(tempDir);
    const results = await auditProject(tempDir);

    expect(results.every((r) => !r.skipped)).toBe(true);
  });

  it("total pass count matches total expectation count", async () => {
    await scaffoldFullProject(tempDir);
    const results = await auditProject(tempDir);

    const totalExpectations = results.reduce(
      (sum, lr) => sum + lr.results.length,
      0,
    );
    const totalPassed = results.reduce(
      (sum, lr) => sum + lr.results.filter((r) => r.status === "pass").length,
      0,
    );

    expect(totalPassed).toBe(totalExpectations);
    // Confirm we tested the expected number of expectations
    const blueprintTotal = AUDIT_BLUEPRINT.reduce(
      (sum, l) => sum + l.expectations.length,
      0,
    );
    expect(totalExpectations).toBe(blueprintTotal);
  });
});

// ---------------------------------------------------------------------------
// Scenario 3: Partial project (gating behavior)
// ---------------------------------------------------------------------------

describe("audit integration -- partial project (Layer 0 passes, Layer 1 fails)", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = join(tmpdir(), `meto-audit-partial-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("Layer 0 passes, Layer 1 has failures, Layers 2-3 are skipped", async () => {
    // Create Layer 0 prerequisites only
    await mkdir(join(tempDir, ".git"));
    await mkdir(join(tempDir, "src"));

    const results = await auditProject(tempDir);

    // Layer 0: all pass
    expect(results[0].skipped).toBe(false);
    expect(layerPassed(results[0])).toBe(true);

    // Layer 1: scanned but has failures
    expect(results[1].skipped).toBe(false);
    expect(layerPassed(results[1])).toBe(false);
    const l1Fails = results[1].results.filter((r) => r.status === "fail");
    expect(l1Fails.length).toBeGreaterThan(0);

    // Layers 2-3: skipped due to Layer 1 failure
    expect(results[2].skipped).toBe(true);
    expect(results[3].skipped).toBe(true);
  });
});

describe("audit integration -- partial project (Layers 0-1 pass, Layer 2 fails)", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = join(tmpdir(), `meto-audit-partial2-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("Layers 0-1 pass, Layer 2 fails, Layer 3 is skipped", async () => {
    // Layer 0
    await mkdir(join(tempDir, ".git"));
    await mkdir(join(tempDir, "src"));

    // Layer 1 -- all 15 expectations
    await writeFile(join(tempDir, "CLAUDE.md"), "# CLAUDE\n");
    await mkdir(join(tempDir, "ai", "context"), { recursive: true });
    await writeFile(join(tempDir, "ai/context/product-vision.md"), "# V\n");
    await writeFile(join(tempDir, "ai/context/tech-stack.md"), "# T\n");
    await writeFile(join(tempDir, "ai/context/decisions.md"), "# D\n");
    await mkdir(join(tempDir, "ai", "tasks"), { recursive: true });
    await writeFile(join(tempDir, "ai/tasks/tasks-backlog.md"), "# B\n");
    await writeFile(join(tempDir, "ai/tasks/tasks-todo.md"), "# T\n");
    await writeFile(join(tempDir, "ai/tasks/tasks-in-progress.md"), "# I\n");
    await writeFile(join(tempDir, "ai/tasks/tasks-in-testing.md"), "# T\n");
    await writeFile(join(tempDir, "ai/tasks/tasks-done.md"), "# D\n");
    await mkdir(join(tempDir, "ai", "workflows"), { recursive: true });
    await writeFile(
      join(tempDir, "ai/workflows/definition-of-done.md"),
      "# DoD\n",
    );
    await writeFile(
      join(tempDir, "ai/workflows/commit-conventions.md"),
      "# CC\n",
    );

    // Layer 2: intentionally missing (no .claude/)

    const results = await auditProject(tempDir);

    // L0: pass
    expect(layerPassed(results[0])).toBe(true);
    // L1: pass
    expect(layerPassed(results[1])).toBe(true);
    // L2: scanned but fails
    expect(results[2].skipped).toBe(false);
    expect(layerPassed(results[2])).toBe(false);
    // L3: skipped
    expect(results[3].skipped).toBe(true);
  });
});

describe("audit integration -- Layer 0 custom checks", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = join(tmpdir(), `meto-audit-custom-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("accepts alternative source directories (lib, app, etc.)", async () => {
    await mkdir(join(tempDir, ".git"));
    await mkdir(join(tempDir, "lib"));

    const results = await auditProject(tempDir);
    const srcResult = results[0].results.find(
      (r) => r.expectation.id === "L0-source-dir",
    );
    expect(srcResult?.status).toBe("pass");
  });

  it("fails source-dir check when no recognized directory exists", async () => {
    await mkdir(join(tempDir, ".git"));
    // No src, lib, app, pkg, cmd, or internal dirs

    const results = await auditProject(tempDir);
    const srcResult = results[0].results.find(
      (r) => r.expectation.id === "L0-source-dir",
    );
    expect(srcResult?.status).toBe("fail");
  });
});
