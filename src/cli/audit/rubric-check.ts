/**
 * Rubric compliance checker for the `meto audit --rubric` flag.
 *
 * Reads the last N completed slices from tasks-done.md and checks each one for:
 * 1. Sprint contract file at ai/contracts/slice-NNN-contract.md
 * 2. Rubric score file at ai/rubric/slice-NNN-score.md
 * 3. Verification commands listed in the rubric score file (run live)
 */

import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** The kind of check performed for a slice. */
export type RubricCheckType = "contract" | "score" | "verification";

/** Outcome of a single rubric check. */
export type RubricCheckStatus = "pass" | "fail";

/**
 * Result of one rubric check for one slice.
 */
export interface RubricSliceResult {
  /** The slice ID (e.g. "slice-042") */
  sliceId: string;
  /** Which kind of check this result is for */
  checkType: RubricCheckType;
  /** Whether the check passed or failed */
  status: RubricCheckStatus;
  /** Human-readable explanation */
  message: string;
  /** Instruction for fixing the gap (only present on fail) */
  fixInstruction: string | undefined;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns true if the path exists as a regular file.
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    const s = await stat(filePath);
    return s.isFile();
  } catch {
    return false;
  }
}

/**
 * Reads a file and returns its content, or null on error.
 */
async function readFileOrNull(filePath: string): Promise<string | null> {
  try {
    return await readFile(filePath, "utf-8");
  } catch {
    return null;
  }
}

/**
 * Parses verification commands from a rubric score file.
 *
 * Looks for a "## Verification Commands Run" section and extracts commands
 * from the first column of the markdown table rows below it.
 * Table rows look like: | `npx vitest run` | 0 | |
 */
export function parseVerificationCommands(content: string): string[] {
  const sectionMatch = content.match(
    /## Verification Commands Run[\s\S]*?(?=\n## |\n---|\s*$)/,
  );
  if (!sectionMatch) {
    return [];
  }

  const section = sectionMatch[0];
  const commands: string[] = [];

  for (const line of section.split("\n")) {
    // Match table rows: | `command` | ... |
    const rowMatch = line.match(/^\|\s*`([^`]+)`\s*\|/);
    if (rowMatch) {
      const cmd = rowMatch[1].trim();
      // Skip placeholder lines like "(lint command if present)"
      if (!cmd.startsWith("_") && !cmd.includes("if present")) {
        commands.push(cmd);
      }
    }
  }

  return commands;
}

/**
 * Runs a shell command synchronously and returns its exit code.
 * The command is split on the first space: head = binary, rest = args.
 */
function runCommand(command: string, cwd: string): number {
  const parts = command.split(/\s+/);
  const bin = parts[0];
  const args = parts.slice(1);

  const result = spawnSync(bin, args, {
    cwd,
    stdio: "pipe",
    encoding: "utf-8",
    shell: false,
  });

  return result.status ?? 1;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Reads ai/tasks/tasks-done.md and extracts the top N slice IDs.
 * Slices appear newest-first in the file (most recently added at the top).
 *
 * Returns an array of slice IDs like ["slice-091", "slice-090", ...].
 * Returns an empty array if the file is missing or unreadable.
 */
export async function extractLastSlices(
  projectDir: string,
  count: number,
): Promise<string[]> {
  const filePath = join(projectDir, "ai", "tasks", "tasks-done.md");
  const content = await readFileOrNull(filePath);
  if (content === null) {
    return [];
  }

  const sliceIds: string[] = [];
  for (const line of content.split("\n")) {
    // Match: ## [slice-NNN] -- ...
    const match = line.match(/^##\s+\[(slice-\d+)\]/);
    if (match) {
      sliceIds.push(match[1]);
    }
  }

  return sliceIds.slice(0, count);
}

/**
 * Runs rubric compliance checks for the given slice IDs.
 *
 * For each slice:
 * - Checks contract file exists at ai/contracts/slice-NNN-contract.md
 * - Checks rubric score file exists at ai/rubric/slice-NNN-score.md
 * - If score file exists, parses and runs verification commands live
 *
 * Returns a flat array of RubricSliceResult (multiple results per slice).
 */
export async function buildRubricChecks(
  projectDir: string,
  sliceIds: string[],
): Promise<RubricSliceResult[]> {
  const results: RubricSliceResult[] = [];

  for (const sliceId of sliceIds) {
    const sliceNum = sliceId.replace("slice-", "");

    // Check 1: contract file
    const contractPath = join(
      projectDir,
      "ai",
      "contracts",
      `slice-${sliceNum}-contract.md`,
    );
    const contractExists = await fileExists(contractPath);
    results.push({
      sliceId,
      checkType: "contract",
      status: contractExists ? "pass" : "fail",
      message: contractExists
        ? `Found ai/contracts/slice-${sliceNum}-contract.md`
        : `Missing ai/contracts/slice-${sliceNum}-contract.md`,
      fixInstruction: contractExists
        ? undefined
        : `Create ai/contracts/slice-${sliceNum}-contract.md from the sprint contract template before work begins`,
    });

    // Check 2: rubric score file
    const scorePath = join(
      projectDir,
      "ai",
      "rubric",
      `slice-${sliceNum}-score.md`,
    );
    const scoreExists = await fileExists(scorePath);
    results.push({
      sliceId,
      checkType: "score",
      status: scoreExists ? "pass" : "fail",
      message: scoreExists
        ? `Found ai/rubric/slice-${sliceNum}-score.md`
        : `Missing ai/rubric/slice-${sliceNum}-score.md`,
      fixInstruction: scoreExists
        ? undefined
        : `@meto-tester must create ai/rubric/slice-${sliceNum}-score.md after evaluating slice-${sliceNum}`,
    });

    // Check 3: verification commands in score file (only if score file exists)
    if (scoreExists) {
      const scoreContent = await readFileOrNull(scorePath);
      const commands = scoreContent
        ? parseVerificationCommands(scoreContent)
        : [];

      if (commands.length === 0) {
        results.push({
          sliceId,
          checkType: "verification",
          status: "fail",
          message: `No verification commands found in ai/rubric/slice-${sliceNum}-score.md`,
          fixInstruction:
            `Add a 'Verification Commands Run' table to ai/rubric/slice-${sliceNum}-score.md listing commands and their exit codes`,
        });
      } else {
        for (const cmd of commands) {
          const exitCode = runCommand(cmd, projectDir);
          const passed = exitCode === 0;
          results.push({
            sliceId,
            checkType: "verification",
            status: passed ? "pass" : "fail",
            message: passed
              ? `\`${cmd}\` exited 0`
              : `\`${cmd}\` exited ${exitCode} (expected 0)`,
            fixInstruction: passed
              ? undefined
              : `Run \`${cmd}\` in the project root and fix all errors before closing slice-${sliceNum}`,
          });
        }
      }
    }
  }

  return results;
}
