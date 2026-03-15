import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import type { BlueprintExpectation, BlueprintLayer } from "./blueprint.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Outcome of a single expectation check. */
export type CheckStatus = "pass" | "fail" | "skip";

/**
 * Result of scanning a single blueprint expectation against the filesystem.
 */
export interface ScanResult {
  /** The expectation that was checked */
  expectation: BlueprintExpectation;
  /** Whether the check passed, failed, or was skipped */
  status: CheckStatus;
  /** Human-readable explanation of the result */
  message: string;
}

/**
 * Result of scanning an entire blueprint layer.
 */
export interface LayerScanResult {
  /** The layer that was scanned */
  layer: BlueprintLayer;
  /** Individual results for each expectation in the layer */
  results: ScanResult[];
  /** Whether this layer was skipped (e.g. due to gating) */
  skipped: boolean;
  /** Reason the layer was skipped, if applicable */
  skipReason?: string;
}

// ---------------------------------------------------------------------------
// Filesystem helpers
// ---------------------------------------------------------------------------

/**
 * Checks whether the given path is a directory.
 */
async function isDirectory(filePath: string): Promise<boolean> {
  try {
    const stats = await stat(filePath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Checks whether the given path is a file.
 */
async function isFile(filePath: string): Promise<boolean> {
  try {
    const stats = await stat(filePath);
    return stats.isFile();
  } catch {
    return false;
  }
}

/**
 * Checks whether a file exists and contains a given substring.
 */
async function fileContains(
  filePath: string,
  pattern: string,
): Promise<boolean> {
  try {
    const content = await readFile(filePath, "utf-8");
    return content.toLowerCase().includes(pattern.toLowerCase());
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Custom check handlers for Layer 0
// ---------------------------------------------------------------------------

/**
 * Custom check: README exists (case-insensitive match).
 * The blueprint path is a glob hint like "README*".
 */
async function checkReadmeGlob(projectDir: string): Promise<boolean> {
  try {
    const entries = await readdir(projectDir);
    return entries.some((entry) =>
      entry.toLowerCase().startsWith("readme"),
    );
  } catch {
    return false;
  }
}

/**
 * Custom check: at least one of the pipe-delimited directory names exists.
 * The blueprint path looks like "src|lib|app|pkg|cmd|internal".
 */
async function checkAlternativeDirs(
  projectDir: string,
  pathSpec: string,
): Promise<boolean> {
  const candidates = pathSpec.split("|");
  for (const candidate of candidates) {
    if (await isDirectory(join(projectDir, candidate))) {
      return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Core scanner
// ---------------------------------------------------------------------------

/**
 * Evaluates a single blueprint expectation against the project filesystem.
 */
async function evaluateExpectation(
  projectDir: string,
  expectation: BlueprintExpectation,
): Promise<ScanResult> {
  const fullPath = join(projectDir, expectation.path);

  switch (expectation.checkType) {
    case "file-exists": {
      const exists = await isFile(fullPath);
      return {
        expectation,
        status: exists ? "pass" : "fail",
        message: exists
          ? `Found ${expectation.path}`
          : `Missing ${expectation.path}`,
      };
    }

    case "dir-exists": {
      const exists = await isDirectory(fullPath);
      return {
        expectation,
        status: exists ? "pass" : "fail",
        message: exists
          ? `Found ${expectation.path}/`
          : `Missing ${expectation.path}/`,
      };
    }

    case "file-contains": {
      const pattern = expectation.containsPattern;
      if (pattern === undefined) {
        return {
          expectation,
          status: "skip",
          message: `No containsPattern defined for ${expectation.id}`,
        };
      }
      const found = await fileContains(fullPath, pattern);
      return {
        expectation,
        status: found ? "pass" : "fail",
        message: found
          ? `${expectation.path} contains expected content`
          : `${expectation.path} is missing expected content`,
      };
    }

    case "custom": {
      // Dispatch based on known custom patterns
      if (expectation.path.toLowerCase().startsWith("readme")) {
        const exists = await checkReadmeGlob(projectDir);
        return {
          expectation,
          status: exists ? "pass" : "fail",
          message: exists
            ? "README file found"
            : "No README file found in the project root",
        };
      }

      if (expectation.path.includes("|")) {
        const exists = await checkAlternativeDirs(
          projectDir,
          expectation.path,
        );
        return {
          expectation,
          status: exists ? "pass" : "fail",
          message: exists
            ? "Source code directory found"
            : `No source directory found (looked for: ${expectation.path.replace(/\|/g, ", ")})`,
        };
      }

      // Fallback: treat as file-exists
      const exists = await isFile(fullPath);
      return {
        expectation,
        status: exists ? "pass" : "fail",
        message: exists
          ? `Found ${expectation.path}`
          : `Missing ${expectation.path}`,
      };
    }
  }
}

/**
 * Scans all expectations in a single blueprint layer against the project filesystem.
 * Returns a LayerScanResult with individual results for each expectation.
 *
 * This function is layer-agnostic -- it works with any BlueprintLayer.
 */
export async function scanLayer(
  projectDir: string,
  layer: BlueprintLayer,
): Promise<LayerScanResult> {
  const results: ScanResult[] = [];

  for (const expectation of layer.expectations) {
    const result = await evaluateExpectation(projectDir, expectation);
    results.push(result);
  }

  return {
    layer,
    results,
    skipped: false,
  };
}

/**
 * Creates a skipped LayerScanResult for a layer that was gated out.
 * All expectations are marked as "skip" with a reason.
 */
export function skipLayer(
  layer: BlueprintLayer,
  reason: string,
): LayerScanResult {
  const results: ScanResult[] = layer.expectations.map((expectation) => ({
    expectation,
    status: "skip" as const,
    message: reason,
  }));

  return {
    layer,
    results,
    skipped: true,
    skipReason: reason,
  };
}

/**
 * Checks whether all expectations in a LayerScanResult passed.
 */
export function layerPassed(layerResult: LayerScanResult): boolean {
  if (layerResult.skipped) {
    return false;
  }
  return layerResult.results.every((r) => r.status === "pass");
}

/**
 * Returns all failed results from a LayerScanResult.
 */
export function getFailedResults(layerResult: LayerScanResult): ScanResult[] {
  return layerResult.results.filter((r) => r.status === "fail");
}
