/**
 * Display helpers for the `meto audit --rubric` flag.
 *
 * Separated from rubric-check.ts (pure data) and index.ts (CLI entry point)
 * so it can be unit-tested without stdin/process.exit mocking.
 */

import * as p from "@clack/prompts";
import type { RubricSliceResult } from "./rubric-check.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Summary counts returned by displayRubricResults.
 * Used by the caller (index.ts) to drive the exit code and outro message.
 */
export interface RubricSummary {
  passed: number;
  failed: number;
  total: number;
  /** All formatted lines emitted (for testing without mocking @clack/prompts). */
  lines: string[];
}

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

/**
 * Returns true if any result in the array has status "fail".
 */
export function rubricHasFailed(results: RubricSliceResult[]): boolean {
  return results.some((r) => r.status === "fail");
}

/**
 * Formats a single rubric check result into a human-readable label.
 * Used internally and exposed for testing.
 */
export function formatRubricLine(result: RubricSliceResult): string {
  const typeLabel =
    result.checkType === "contract"
      ? "contract"
      : result.checkType === "score"
        ? "rubric score"
        : "verification";

  const status = result.status === "pass" ? "pass" : "FAIL";
  let line = `[${result.sliceId}] ${typeLabel}: ${status} — ${result.message}`;

  if (result.status === "fail" && result.fixInstruction !== undefined) {
    line += `\n  Fix: ${result.fixInstruction}`;
  }

  return line;
}

// ---------------------------------------------------------------------------
// Display (calls @clack/prompts — not unit-tested directly)
// ---------------------------------------------------------------------------

/**
 * Renders rubric check results using the same @clack/prompts styling as the
 * existing audit layers, then returns a RubricSummary for exit-code decisions.
 *
 * This function calls p.log.success / p.log.error so it must only be called
 * from the CLI entry point, not from unit tests.
 */
export function displayRubricResults(
  results: RubricSliceResult[],
): RubricSummary {
  const lines: string[] = [];
  let passed = 0;
  let failed = 0;

  for (const result of results) {
    const line = formatRubricLine(result);
    lines.push(line);

    if (result.status === "pass") {
      p.log.success(line);
      passed++;
    } else {
      p.log.error(line);
      failed++;
    }
  }

  const total = results.length;

  p.note(
    `${passed}/${total} passed, ${failed} failed`,
    "Rubric Compliance",
  );

  return { passed, failed, total, lines };
}
