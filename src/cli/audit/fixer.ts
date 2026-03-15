import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import * as p from "@clack/prompts";
import { replaceTokens, resolveTemplatesDir } from "../renderer.js";
import type { TokenMap } from "../renderer.js";
import type { ScanResult, LayerScanResult } from "./scanner.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Outcome of a single fix attempt. */
export type FixOutcome = "created" | "declined" | "skipped" | "error";

/**
 * Result of attempting to fix a single failed expectation.
 */
export interface FixResult {
  /** The scan result that triggered this fix */
  scanResult: ScanResult;
  /** What happened during the fix attempt */
  outcome: FixOutcome;
  /** Human-readable message about the fix */
  message: string;
}

/**
 * Result of running the fixer on an entire layer.
 */
export interface LayerFixResult {
  /** Layer ID that was fixed */
  layerId: number;
  /** Individual fix results */
  fixes: FixResult[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Checks whether a file exists at the given path.
 * Used to prevent overwriting existing files.
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Reads a template file from the templates directory and applies token substitution.
 * Returns undefined if the template does not exist.
 */
async function readAndRenderTemplate(
  templateRelativePath: string,
  tokens: TokenMap,
): Promise<string | undefined> {
  const templatesDir = resolveTemplatesDir();
  const templatePath = join(templatesDir, templateRelativePath);

  try {
    const raw = await readFile(templatePath, "utf-8");
    return replaceTokens(raw, tokens);
  } catch {
    return undefined;
  }
}

/**
 * Writes content to a file, creating parent directories as needed.
 * Never overwrites existing files.
 */
async function writeFileIfMissing(
  filePath: string,
  content: string,
): Promise<boolean> {
  if (await fileExists(filePath)) {
    return false;
  }

  const dir = dirname(filePath);
  await mkdir(dir, { recursive: true });
  await writeFile(filePath, content, "utf-8");
  return true;
}

// ---------------------------------------------------------------------------
// Fixer
// ---------------------------------------------------------------------------

/**
 * Determines the template path for a given blueprint expectation path.
 * Most paths map directly (e.g. "CLAUDE.md" -> "CLAUDE.md" in templates/).
 * Directories don't have a template -- they are created implicitly.
 */
function getTemplatePath(expectationPath: string, checkType: string): string | undefined {
  // Directories are created implicitly when files inside them are created.
  // For standalone dir-exists checks, we create the directory directly.
  if (checkType === "dir-exists") {
    return undefined;
  }

  // Custom checks (like README glob, alternative dirs) are not fixable via templates
  if (checkType === "custom") {
    return undefined;
  }

  // Direct path mapping for file-exists and file-contains
  return expectationPath;
}

/**
 * Attempts to fix a single failed expectation by creating the missing file or directory.
 * Prompts the user for confirmation before each creation.
 *
 * This function is layer-agnostic -- it works with any failed ScanResult.
 */
async function fixSingleExpectation(
  projectDir: string,
  scanResult: ScanResult,
  tokens: TokenMap,
): Promise<FixResult> {
  const { expectation } = scanResult;

  // Not fixable according to blueprint
  if (!expectation.fixable) {
    return {
      scanResult,
      outcome: "skipped",
      message: `${expectation.description} is not auto-fixable`,
    };
  }

  const targetPath = join(projectDir, expectation.path);

  // Already exists -- should not happen for failed checks, but be safe
  if (await fileExists(targetPath)) {
    return {
      scanResult,
      outcome: "skipped",
      message: `${expectation.path} already exists`,
    };
  }

  // Prompt user
  const shouldFix = await p.confirm({
    message: `Create ${expectation.path}? (${expectation.description})`,
    initialValue: true,
  });

  if (p.isCancel(shouldFix) || !shouldFix) {
    return {
      scanResult,
      outcome: "declined",
      message: `Skipped ${expectation.path}`,
    };
  }

  // Handle directory creation
  if (expectation.checkType === "dir-exists") {
    try {
      await mkdir(targetPath, { recursive: true });
      return {
        scanResult,
        outcome: "created",
        message: `Created directory ${expectation.path}/`,
      };
    } catch (err: unknown) {
      const reason = err instanceof Error ? err.message : "Unknown error";
      return {
        scanResult,
        outcome: "error",
        message: `Failed to create ${expectation.path}/: ${reason}`,
      };
    }
  }

  // Handle file creation from template
  const templatePath = getTemplatePath(expectation.path, expectation.checkType);
  if (templatePath === undefined) {
    return {
      scanResult,
      outcome: "skipped",
      message: `No template available for ${expectation.path}`,
    };
  }

  const rendered = await readAndRenderTemplate(templatePath, tokens);
  if (rendered === undefined) {
    return {
      scanResult,
      outcome: "error",
      message: `Template not found for ${expectation.path}`,
    };
  }

  try {
    const written = await writeFileIfMissing(targetPath, rendered);
    if (written) {
      return {
        scanResult,
        outcome: "created",
        message: `Created ${expectation.path}`,
      };
    }
    return {
      scanResult,
      outcome: "skipped",
      message: `${expectation.path} already exists (race condition)`,
    };
  } catch (err: unknown) {
    const reason = err instanceof Error ? err.message : "Unknown error";
    return {
      scanResult,
      outcome: "error",
      message: `Failed to create ${expectation.path}: ${reason}`,
    };
  }
}

/**
 * Runs the interactive fixer for all failed expectations in a layer scan result.
 * Prompts the user for each missing file/directory and creates it from templates.
 *
 * This function is layer-agnostic -- it works with any LayerScanResult.
 * The fixer never overwrites existing files -- only creates missing ones.
 *
 * @param projectDir - Absolute path to the project root
 * @param layerResult - The scan result containing failures to fix
 * @param tokens - Token map for template rendering
 * @returns Fix results for each failed expectation
 */
export async function fixLayer(
  projectDir: string,
  layerResult: LayerScanResult,
  tokens: TokenMap,
): Promise<LayerFixResult> {
  const failedResults = layerResult.results.filter((r) => r.status === "fail");
  const fixes: FixResult[] = [];

  if (failedResults.length === 0) {
    return {
      layerId: layerResult.layer.id,
      fixes,
    };
  }

  p.log.info(
    `Layer ${layerResult.layer.id} (${layerResult.layer.name}): ${failedResults.length} issue${failedResults.length === 1 ? "" : "s"} found`,
  );

  for (const failed of failedResults) {
    const fixResult = await fixSingleExpectation(projectDir, failed, tokens);
    fixes.push(fixResult);

    // Display result
    switch (fixResult.outcome) {
      case "created":
        p.log.success(fixResult.message);
        break;
      case "declined":
        p.log.info(fixResult.message);
        break;
      case "skipped":
        p.log.warning(fixResult.message);
        break;
      case "error":
        p.log.error(fixResult.message);
        break;
    }
  }

  return {
    layerId: layerResult.layer.id,
    fixes,
  };
}
