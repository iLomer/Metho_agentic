/**
 * Reporter for the audit command.
 * Formats and displays audit results with layered progress bars,
 * per-check pass/fail/skip indicators, and an overall summary.
 *
 * This module is display-only -- it never prompts for fixes.
 */

import * as p from "@clack/prompts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** The outcome of a single check within a layer. */
export type CheckStatus = "pass" | "fail" | "skip";

/** Result of evaluating one blueprint expectation. */
export interface CheckResult {
  /** Human-readable description of the check */
  description: string;
  /** Whether the check passed, failed, or was skipped */
  status: CheckStatus;
  /** Optional message explaining the result (shown on fail/skip) */
  message?: string;
  /** Optional suggested fix action (shown on fail) */
  suggestedFix?: string;
}

/** Aggregated result for one audit layer. */
export interface LayerResult {
  /** Numeric layer identifier (0, 1, 2, 3) */
  layerId: number;
  /** Human-readable layer name */
  layerName: string;
  /** Whether the layer was skipped due to a prior layer failing */
  skipped: boolean;
  /** Individual check results (empty if skipped) */
  checks: CheckResult[];
}

// ---------------------------------------------------------------------------
// Progress bar rendering
// ---------------------------------------------------------------------------

const BAR_WIDTH = 20;
const FILLED_CHAR = "\u2588"; // █
const EMPTY_CHAR = "\u2591"; // ░

/**
 * Builds a text-based progress bar string.
 * Example: "████████░░░░░░░░░░░░ 40% (2/5)"
 */
function renderProgressBar(passed: number, total: number): string {
  if (total === 0) {
    return `${EMPTY_CHAR.repeat(BAR_WIDTH)} 0% (0/0)`;
  }

  const ratio = passed / total;
  const filled = Math.round(ratio * BAR_WIDTH);
  const empty = BAR_WIDTH - filled;
  const percentage = Math.round(ratio * 100);

  return `${FILLED_CHAR.repeat(filled)}${EMPTY_CHAR.repeat(empty)} ${percentage}% (${passed}/${total})`;
}

// ---------------------------------------------------------------------------
// Check indicators
// ---------------------------------------------------------------------------

const PASS_INDICATOR = "\u2713"; // ✓
const FAIL_INDICATOR = "\u2717"; // ✗
const SKIP_INDICATOR = "-";
const FIX_ARROW = "\u2192"; // →

/**
 * Formats a single check result line.
 * Pass:  "  ✓ Description"
 * Fail:  "  ✗ Description -- message"
 *        "    → Suggested fix"
 * Skip:  "  - Description"
 */
function formatCheck(check: CheckResult): string {
  const lines: string[] = [];

  switch (check.status) {
    case "pass":
      lines.push(`  ${PASS_INDICATOR} ${check.description}`);
      break;
    case "fail": {
      const suffix = check.message ? ` -- ${check.message}` : "";
      lines.push(`  ${FAIL_INDICATOR} ${check.description}${suffix}`);
      if (check.suggestedFix) {
        lines.push(`    ${FIX_ARROW} ${check.suggestedFix}`);
      }
      break;
    }
    case "skip":
      lines.push(`  ${SKIP_INDICATOR} ${check.description}`);
      break;
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Displays the full audit report using @clack/prompts log methods.
 *
 * For each layer:
 * - If skipped: shows "skipped -- previous layer incomplete"
 * - Otherwise: shows a progress bar and per-check results
 *
 * Ends with an overall summary score.
 */
export function reportAuditResults(results: LayerResult[]): void {
  let totalPassed = 0;
  let totalChecks = 0;

  for (const layer of results) {
    const header = `Layer ${layer.layerId} -- ${layer.layerName}`;

    if (layer.skipped) {
      p.log.message(`${header}: skipped -- previous layer incomplete`);
      continue;
    }

    const passed = layer.checks.filter((c) => c.status === "pass").length;
    const total = layer.checks.length;

    totalPassed += passed;
    totalChecks += total;

    const bar = renderProgressBar(passed, total);
    const checkLines = layer.checks.map(formatCheck).join("\n");

    p.log.message(`${header}\n${bar}\n${checkLines}`);
  }

  // Overall summary
  const overallPercentage =
    totalChecks > 0 ? Math.round((totalPassed / totalChecks) * 100) : 0;

  if (totalPassed === totalChecks && totalChecks > 0) {
    p.log.success(
      `Overall: ${totalPassed}/${totalChecks} checks passed (${overallPercentage}%)`,
    );
  } else {
    p.log.info(
      `Overall: ${totalPassed}/${totalChecks} checks passed (${overallPercentage}%)`,
    );
  }
}
