/**
 * Tests for the --min-tasks threshold logic in run-compact.ts.
 *
 * We test the pure helper functions directly:
 *   - parseMinTasks: parses --min-tasks flag from args array
 *   - countTaskBlocks: counts ## [slice- blocks in raw markdown
 *
 * The integration of these helpers in runCompact() is verified through
 * the exported helpers alone — runCompact itself calls process.exit which
 * would terminate vitest.
 */

import { describe, it, expect } from "vitest";
import {
  parseMinTasks,
  countTaskBlocks,
} from "../../../src/cli/compact/run-compact.js";

// ---------------------------------------------------------------------------
// parseMinTasks
// ---------------------------------------------------------------------------

describe("parseMinTasks", () => {
  it("returns default 20 when no --min-tasks flag is present", () => {
    expect(parseMinTasks([])).toBe(20);
  });

  it("returns default 20 when other flags are present but not --min-tasks", () => {
    expect(parseMinTasks(["--dry-run", "--help"])).toBe(20);
  });

  it("parses --min-tasks=N (equals sign form)", () => {
    expect(parseMinTasks(["--min-tasks=5"])).toBe(5);
  });

  it("parses --min-tasks N (space-separated form)", () => {
    expect(parseMinTasks(["--min-tasks", "10"])).toBe(10);
  });

  it("returns default 20 when --min-tasks value is not a valid number", () => {
    expect(parseMinTasks(["--min-tasks=abc"])).toBe(20);
  });

  it("returns default 20 when --min-tasks is present at end with no value", () => {
    expect(parseMinTasks(["--min-tasks"])).toBe(20);
  });

  it("parses large threshold values", () => {
    expect(parseMinTasks(["--min-tasks=100"])).toBe(100);
  });

  it("parses threshold of 0 (always proceed)", () => {
    expect(parseMinTasks(["--min-tasks=0"])).toBe(0);
  });

  it("parses threshold when mixed with other flags", () => {
    expect(parseMinTasks(["--dry-run", "--min-tasks=15"])).toBe(15);
  });

  it("space-separated form works with other flags after it", () => {
    expect(parseMinTasks(["--min-tasks", "7", "--dry-run"])).toBe(7);
  });
});

// ---------------------------------------------------------------------------
// countTaskBlocks
// ---------------------------------------------------------------------------

describe("countTaskBlocks", () => {
  it("returns 0 for empty string", () => {
    expect(countTaskBlocks("")).toBe(0);
  });

  it("returns 0 when file has only preamble and no task blocks", () => {
    const raw = "# Tasks — Done\n\nNo tasks yet.\n";
    expect(countTaskBlocks(raw)).toBe(0);
  });

  it("returns 1 for a single task block", () => {
    const raw = [
      "# Tasks — Done",
      "",
      "---",
      "",
      "## [slice-001] -- First task",
      "**Epic:** E1 | **Size:** S",
      "",
      "---",
    ].join("\n");
    expect(countTaskBlocks(raw)).toBe(1);
  });

  it("returns 3 for three task blocks", () => {
    const raw = [
      "# Tasks — Done",
      "",
      "---",
      "",
      "## [slice-001] -- First task",
      "**Epic:** E1",
      "",
      "---",
      "",
      "## [slice-002] -- Second task",
      "**Epic:** E1",
      "",
      "---",
      "",
      "## [slice-003] -- Third task",
      "**Epic:** E2",
      "",
      "---",
    ].join("\n");
    expect(countTaskBlocks(raw)).toBe(3);
  });

  it("does not count preamble headings (# or ###) as task blocks", () => {
    const raw = [
      "# Tasks — Done",
      "### Some section",
      "## Not a task block",
      "",
      "---",
      "",
      "## [slice-010] -- A real task",
      "**Epic:** E1",
      "",
      "---",
    ].join("\n");
    expect(countTaskBlocks(raw)).toBe(1);
  });

  it("counts COMPACTED blocks too (they still start with ## [slice-)", () => {
    const raw = [
      "# Tasks — Done",
      "",
      "---",
      "",
      "## [slice-001] -- First task (COMPACTED)",
      "Epic: E1 | Outcome: Built the thing.",
      "",
      "---",
      "",
      "## [slice-002] -- Second task",
      "**Epic:** E1",
      "",
      "---",
    ].join("\n");
    expect(countTaskBlocks(raw)).toBe(2);
  });
});
