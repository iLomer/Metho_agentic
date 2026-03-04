import { execFile } from "node:child_process";
import { access, constants } from "node:fs/promises";
import { dirname, resolve } from "node:path";

/**
 * Result of running pre-flight environment checks.
 */
export interface PreflightResult {
  /** Whether git is available on the system PATH. */
  gitAvailable: boolean;
}

/**
 * Parses the major version number from a Node.js version string.
 * Expects the format "vMAJOR.MINOR.PATCH" (e.g. "v18.12.0").
 * Returns NaN if the format is unrecognized.
 */
export function parseNodeMajorVersion(versionString: string): number {
  const match = /^v(\d+)/.exec(versionString);
  if (!match) {
    return NaN;
  }
  return parseInt(match[1], 10);
}

/**
 * Checks whether the current Node.js version meets the minimum requirement.
 * Returns an error message string if the version is too old, or undefined if OK.
 */
export function checkNodeVersion(
  versionString: string,
  minimumMajor: number,
): string | undefined {
  const major = parseNodeMajorVersion(versionString);
  if (Number.isNaN(major) || major < minimumMajor) {
    return `Lom requires Node.js ${minimumMajor} or later. You are running ${versionString}.`;
  }
  return undefined;
}

/**
 * Checks whether git is available by running `git --version`.
 * Resolves to true if git is found, false otherwise.
 */
export function checkGitAvailable(): Promise<boolean> {
  return new Promise((promiseResolve) => {
    execFile("git", ["--version"], (error) => {
      promiseResolve(error === null);
    });
  });
}

/**
 * Checks whether the parent directory of the given output path exists and is writable.
 * Returns an error message string if the check fails, or undefined if OK.
 */
export async function checkWritePermission(
  outputPath: string,
): Promise<string | undefined> {
  const absolutePath = resolve(outputPath);
  const parentDir = dirname(absolutePath);

  try {
    await access(parentDir, constants.W_OK);
    return undefined;
  } catch (err: unknown) {
    const reason =
      err instanceof Error ? err.message : "permission denied";
    return `Cannot write to ${absolutePath}: ${reason}`;
  }
}

/**
 * Runs pre-flight environment checks before prompts begin.
 *
 * - Validates Node.js version (exits with code 1 if < 18)
 * - Checks git availability (stores warning, does not exit)
 *
 * Returns a PreflightResult with the check outcomes.
 */
export async function runPreflightChecks(): Promise<PreflightResult> {
  const nodeError = checkNodeVersion(process.version, 18);
  if (nodeError !== undefined) {
    throw new PreflightError(nodeError);
  }

  const gitAvailable = await checkGitAvailable();

  return { gitAvailable };
}

/**
 * Error thrown when a blocking pre-flight check fails.
 */
export class PreflightError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PreflightError";
  }
}
