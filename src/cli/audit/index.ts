import { readdir, stat } from "node:fs/promises";
import * as p from "@clack/prompts";
import { AUDIT_BLUEPRINT } from "./blueprint.js";
import { detectStack } from "./detect-stack.js";
import {
  scanLayer,
  skipLayer,
  layerPassed,
  getFailedResults,
} from "./scanner.js";
import { fixLayer, fixLayerTwo, fixLayerThree } from "./fixer.js";
import type { LayerScanResult } from "./scanner.js";
import type { TokenMap } from "../renderer.js";
import { getCodeGuidelines, getDefinitionOfDone } from "../stacks.js";

// ---------------------------------------------------------------------------
// Types (kept for backward compatibility -- may be consumed by other modules)
// ---------------------------------------------------------------------------

/**
 * Result of a single audit check (legacy interface from Layer 0 scaffold).
 * Retained for backward compatibility; the scanner uses ScanResult internally.
 */
export interface AuditCheckResult {
  /** Human-readable name of the check */
  name: string;
  /** Whether the check passed or failed */
  status: "pass" | "fail";
  /** Descriptive message explaining the result */
  message: string;
}

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

/**
 * Displays a layer's scan results using @clack/prompts.
 */
function displayLayerResults(layerResult: LayerScanResult): void {
  if (layerResult.skipped) {
    p.note(
      `Skipped: ${layerResult.skipReason ?? "prerequisite layer failed"}`,
      `Layer ${layerResult.layer.id} -- ${layerResult.layer.name}`,
    );
    return;
  }

  for (const result of layerResult.results) {
    if (result.status === "pass") {
      p.log.success(`${result.expectation.description}: ${result.message}`);
    } else if (result.status === "fail") {
      p.log.error(`${result.expectation.description}: ${result.message}`);
    } else {
      p.log.warning(`${result.expectation.description}: ${result.message}`);
    }
  }

  const passed = layerResult.results.filter((r) => r.status === "pass").length;
  const total = layerResult.results.length;
  const failed = layerResult.results.filter((r) => r.status === "fail").length;

  p.note(
    `${passed}/${total} passed, ${failed} failed`,
    `Layer ${layerResult.layer.id} -- ${layerResult.layer.name}`,
  );
}

// ---------------------------------------------------------------------------
// Help
// ---------------------------------------------------------------------------

/**
 * Prints usage information for the audit command.
 */
function printAuditHelp(): void {
  p.intro("meto-cli audit");
  p.note(
    [
      "Usage: meto-cli audit [options]",
      "",
      "Checks whether your project meets methodology standards.",
      "Runs layered checks and offers to fix missing files.",
      "",
      "Layers (gated -- each requires the previous to pass):",
      "  Layer 0: Project Prerequisites (git, README, source dir) -- informational, never blocks",
      "  Layer 1: Methodology (CLAUDE.md, ai/ structure, task board, workflows)",
      "  Layer 2: Agents (.claude/ settings, agent definitions, agent memory)",
      "  Layer 3: Governance (definition of done, commit conventions, session checkpoints)",
      "",
      "Options:",
      "  --help, -h    Show this help message",
    ].join("\n"),
    "Help",
  );
  p.outro("Run 'meto-cli audit' from your project root.");
}

// ---------------------------------------------------------------------------
// Token map for audit fixes
// ---------------------------------------------------------------------------

/**
 * Builds a minimal token map for rendering templates during audit fixes.
 * Uses placeholder values since we are creating missing files in an existing project
 * rather than scaffolding a brand-new one.
 *
 * When a definition-of-done value is provided (from stack detection), it is used
 * instead of the generic placeholder. This allows Layer 3 governance files to
 * contain stack-appropriate done criteria.
 */
function buildAuditTokenMap(
  projectDir: string,
  definitionOfDone?: string,
  codeGuidelinesStack?: string,
): TokenMap {
  const projectName = projectDir.split("/").pop() ?? "my-project";

  return {
    PROJECT_NAME: projectName,
    PRODUCT_VISION: "To be defined",
    TECH_STACK: "To be defined",
    TARGET_USERS: "To be defined",
    PROBLEM_STATEMENT: "To be defined",
    SUCCESS_CRITERIA: "To be defined",
    VALUE_PROPOSITION: "To be defined",
    OUT_OF_SCOPE: "To be defined",
    CODE_CONVENTIONS: "To be defined",
    CODE_GUIDELINES_STACK: codeGuidelinesStack ?? "",
    DEFINITION_OF_DONE: definitionOfDone ?? "To be defined by @meto-pm",
    STARTER_EPICS: "",
    STARTER_TASKS: "",
    WORKFLOW_AGENTS_SECTION: "",
  };
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

/**
 * Checks whether the given path is a directory.
 */
async function isDirectory(dirPath: string): Promise<boolean> {
  try {
    const stats = await stat(dirPath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

/**
 * Entry point for the `meto-cli audit` command.
 *
 * Runs layered checks against the project directory:
 * 1. Layer 0 (Project Prerequisites) -- must all pass to continue
 * 2. Layer 1 (Methodology) -- gated on Layer 0; offers interactive fixes
 *
 * Returns the collected scan results for use by the reporter (slice-069).
 */
export async function runAudit(): Promise<LayerScanResult[]> {
  const args = process.argv.slice(3);

  if (args.includes("--help") || args.includes("-h")) {
    printAuditHelp();
    return [];
  }

  p.intro("meto-cli audit");

  const projectDir = process.cwd();

  const isValid = await isDirectory(projectDir);
  if (!isValid) {
    p.log.error(
      "Current directory is not a valid project directory. Run this command from within your project root.",
    );
    p.outro("");
    process.exit(1);
    return [];
  }

  let entries: string[];
  try {
    entries = await readdir(projectDir);
  } catch {
    p.log.error(
      "Could not read the current directory. Check permissions and try again.",
    );
    p.outro("");
    process.exit(1);
    return [];
  }

  if (entries.length === 0) {
    p.log.error(
      "Current directory is empty. Run this command from within an existing project.",
    );
    p.outro("");
    process.exit(1);
    return [];
  }

  p.log.info(`Auditing project at ${projectDir}`);

  // Detect tech stack for stack-specific definition-of-done content
  const detected = await detectStack(projectDir);
  const stackDod = getDefinitionOfDone(detected.stack);
  const stackGuidelines = getCodeGuidelines(detected.stack);

  const allLayerResults: LayerScanResult[] = [];
  let previousLayerPassed = true;

  for (const layer of AUDIT_BLUEPRINT) {
    // Gating: Layer 0 is informational only — never blocks.
    // All other layers are gated on the previous layer passing.
    if (!previousLayerPassed && layer.id > 1) {
      const skipped = skipLayer(
        layer,
        `Layer ${layer.id - 1} did not pass -- skipping Layer ${layer.id}`,
      );
      allLayerResults.push(skipped);
      displayLayerResults(skipped);
      continue;
    }

    // Scan the layer
    const scanResult = await scanLayer(projectDir, layer);
    displayLayerResults(scanResult);

    // If there are fixable failures, run the fixer
    const failures = getFailedResults(scanResult);
    const fixableFailures = failures.filter((r) => r.expectation.fixable);

    if (fixableFailures.length > 0) {
      const tokens = buildAuditTokenMap(projectDir, stackDod, stackGuidelines);
      let fixResult;
      if (layer.id === 2) {
        fixResult = await fixLayerTwo(projectDir, scanResult, tokens);
      } else if (layer.id === 3) {
        fixResult = await fixLayerThree(projectDir, scanResult, tokens);
      } else {
        fixResult = await fixLayer(projectDir, scanResult, tokens);
      }

      // Re-scan after fixes to get updated results
      const created = fixResult.fixes.filter((f) => f.outcome === "created");
      if (created.length > 0) {
        p.log.info(`Fixed ${created.length} issue${created.length === 1 ? "" : "s"} in Layer ${layer.id}`);

        // Re-scan to reflect fixes
        const rescanResult = await scanLayer(projectDir, layer);
        allLayerResults.push(rescanResult);
        previousLayerPassed = layer.id === 0 ? true : layerPassed(rescanResult);
      } else {
        allLayerResults.push(scanResult);
        previousLayerPassed = layerPassed(scanResult);
      }
    } else {
      allLayerResults.push(scanResult);
      // Layer 0 is informational — its failures never gate Layer 1
      previousLayerPassed = layer.id === 0 ? true : layerPassed(scanResult);
    }
  }

  // Summary
  const totalExpectations = allLayerResults.reduce(
    (sum, lr) => sum + lr.results.length,
    0,
  );
  const totalPassed = allLayerResults.reduce(
    (sum, lr) => sum + lr.results.filter((r) => r.status === "pass").length,
    0,
  );
  const totalFailed = allLayerResults.reduce(
    (sum, lr) => sum + lr.results.filter((r) => r.status === "fail").length,
    0,
  );

  if (totalFailed > 0) {
    p.outro(
      `Audit complete: ${totalPassed}/${totalExpectations} passed, ${totalFailed} failed`,
    );
    process.exit(1);
  } else {
    p.outro(
      `Audit complete: ${totalPassed}/${totalExpectations} checks passed`,
    );
  }

  return allLayerResults;
}
