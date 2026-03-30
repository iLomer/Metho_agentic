/**
 * Tests for the --rubric flag display logic in the audit command.
 *
 * We test the pure functions that are extracted from runAudit:
 * - displayRubricResults (output formatting)
 * - rubricHasFailed (exit code determination)
 *
 * We do NOT test the runAudit() entry point directly because it requires
 * stdin and process.exit mocking (same constraint as audit-integration.test.ts).
 */

import { describe, it, expect } from "vitest";
import {
  rubricHasFailed,
  displayRubricResults,
} from "../../src/cli/audit/rubric-display.js";
import type { RubricSliceResult } from "../../src/cli/audit/rubric-check.js";

// ---------------------------------------------------------------------------
// rubricHasFailed
// ---------------------------------------------------------------------------

describe("rubricHasFailed", () => {
  it("returns false when all checks pass", () => {
    const results: RubricSliceResult[] = [
      {
        sliceId: "slice-010",
        checkType: "contract",
        status: "pass",
        message: "Found contract",
        fixInstruction: undefined,
      },
      {
        sliceId: "slice-010",
        checkType: "score",
        status: "pass",
        message: "Found score",
        fixInstruction: undefined,
      },
    ];
    expect(rubricHasFailed(results)).toBe(false);
  });

  it("returns true when any check fails", () => {
    const results: RubricSliceResult[] = [
      {
        sliceId: "slice-010",
        checkType: "contract",
        status: "pass",
        message: "Found contract",
        fixInstruction: undefined,
      },
      {
        sliceId: "slice-010",
        checkType: "score",
        status: "fail",
        message: "Missing score",
        fixInstruction: "Create the score file",
      },
    ];
    expect(rubricHasFailed(results)).toBe(true);
  });

  it("returns false for empty results", () => {
    expect(rubricHasFailed([])).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// displayRubricResults — smoke test (no crash, returns summary)
// ---------------------------------------------------------------------------

describe("displayRubricResults", () => {
  it("returns a summary with passed and total counts", () => {
    const results: RubricSliceResult[] = [
      {
        sliceId: "slice-010",
        checkType: "contract",
        status: "pass",
        message: "Found contract",
        fixInstruction: undefined,
      },
      {
        sliceId: "slice-010",
        checkType: "score",
        status: "fail",
        message: "Missing score file",
        fixInstruction: "Create the score file",
      },
    ];

    const summary = displayRubricResults(results);
    expect(summary.passed).toBe(1);
    expect(summary.total).toBe(2);
    expect(summary.failed).toBe(1);
  });

  it("returns all pass when no failures", () => {
    const results: RubricSliceResult[] = [
      {
        sliceId: "slice-010",
        checkType: "contract",
        status: "pass",
        message: "Found contract",
        fixInstruction: undefined,
      },
      {
        sliceId: "slice-010",
        checkType: "score",
        status: "pass",
        message: "Found score",
        fixInstruction: undefined,
      },
    ];

    const summary = displayRubricResults(results);
    expect(summary.passed).toBe(2);
    expect(summary.total).toBe(2);
    expect(summary.failed).toBe(0);
  });

  it("handles empty results without crashing", () => {
    const summary = displayRubricResults([]);
    expect(summary.passed).toBe(0);
    expect(summary.total).toBe(0);
    expect(summary.failed).toBe(0);
  });

  it("includes fix instructions for failed checks in lines output", () => {
    const results: RubricSliceResult[] = [
      {
        sliceId: "slice-042",
        checkType: "contract",
        status: "fail",
        message: "Missing contract",
        fixInstruction: "Create ai/contracts/slice-042-contract.md",
      },
    ];

    const summary = displayRubricResults(results);
    expect(summary.failed).toBe(1);
    // The function surfaces fix instructions — check via the lines array
    const hasFixInstruction = summary.lines.some((line) =>
      line.includes("ai/contracts/slice-042-contract.md"),
    );
    expect(hasFixInstruction).toBe(true);
  });
});
