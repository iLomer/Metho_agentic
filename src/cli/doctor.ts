import { access } from "node:fs/promises";
import { join, dirname, resolve } from "node:path";
import * as p from "@clack/prompts";
import { runHealthChecks } from "./doctor-checks.js";
import type { HealthCheckResult } from "./doctor-checks.js";

/**
 * Searches upward from the given starting directory for a Meto project root.
 * A Meto project root is identified by the presence of an `ai/tasks/` directory.
 *
 * Returns the absolute path to the project root, or undefined if not found.
 */
export async function findProjectRoot(
  startDir: string,
): Promise<string | undefined> {
  let current = resolve(startDir);

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const candidate = join(current, "ai", "tasks");
    try {
      await access(candidate);
      return current;
    } catch {
      // ai/tasks/ not found at this level, move up
    }

    const parent = dirname(current);
    if (parent === current) {
      // Reached filesystem root without finding a project
      return undefined;
    }
    current = parent;
  }
}

/**
 * Determines the exit code based on health check results.
 * Returns 0 if no failures (warnings are OK), 1 if any check failed.
 */
export function determineExitCode(results: HealthCheckResult[]): number {
  const hasFail = results.some((r) => r.status === "fail");
  return hasFail ? 1 : 0;
}

/**
 * Formats and displays health check results using clack output functions.
 */
function displayResults(results: HealthCheckResult[]): void {
  for (const result of results) {
    switch (result.status) {
      case "pass":
        p.log.success(result.name);
        break;
      case "warn":
        p.log.warning(`${result.name}: ${result.message}`);
        break;
      case "fail":
        p.log.error(`${result.name}: ${result.message}`);
        break;
    }
  }

  const passed = results.filter((r) => r.status === "pass").length;
  const warnings = results.filter((r) => r.status === "warn").length;
  const failed = results.filter((r) => r.status === "fail").length;

  p.note(`${passed} passed, ${warnings} warnings, ${failed} failed`, "Summary");
}

/**
 * Entry point for the `meto-cli doctor` command.
 * Detects the project root, runs health checks, and displays a report.
 */
export async function runDoctor(): Promise<void> {
  p.intro("meto-cli doctor");

  const projectRoot = await findProjectRoot(process.cwd());

  if (projectRoot === undefined) {
    p.log.error(
      "No Meto project found. Run this command from within a Meto-scaffolded project.",
    );
    p.outro("");
    process.exit(1);
  }

  p.log.info(`Meto project detected at ${projectRoot}`);

  const results = await runHealthChecks(projectRoot);
  displayResults(results);

  const exitCode = determineExitCode(results);

  if (exitCode === 0) {
    p.outro("All checks passed.");
  } else {
    p.outro("Some checks failed. Review the issues above.");
  }

  if (exitCode !== 0) {
    process.exit(exitCode);
  }
}
