import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import * as p from "@clack/prompts";

/**
 * Result of a single Layer 0 audit check.
 */
export interface AuditCheckResult {
  /** Human-readable name of the check */
  name: string;
  /** Whether the check passed or failed */
  status: "pass" | "fail";
  /** Descriptive message explaining the result */
  message: string;
}

/**
 * Source code directories to look for. If any one of these exists,
 * the "source code directory" check passes.
 */
const SOURCE_CODE_DIRS: readonly string[] = [
  "src",
  "lib",
  "app",
  "pkg",
  "cmd",
  "internal",
];

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
 * Layer 0 check: git is initialized in the project directory.
 */
async function checkGitInitialized(
  projectDir: string,
): Promise<AuditCheckResult> {
  const gitDir = join(projectDir, ".git");
  const exists = await isDirectory(gitDir);

  if (exists) {
    return {
      name: "Git initialized",
      status: "pass",
      message: ".git directory found",
    };
  }

  return {
    name: "Git initialized",
    status: "fail",
    message: "No .git directory found -- run 'git init' to initialize",
  };
}

/**
 * Layer 0 check: README file exists (case-insensitive match).
 */
async function checkReadmeExists(
  projectDir: string,
): Promise<AuditCheckResult> {
  let entries: string[];
  try {
    entries = await readdir(projectDir);
  } catch {
    return {
      name: "README exists",
      status: "fail",
      message: "Could not read project directory",
    };
  }

  const hasReadme = entries.some((entry) =>
    entry.toLowerCase().startsWith("readme"),
  );

  if (hasReadme) {
    return {
      name: "README exists",
      status: "pass",
      message: "README file found",
    };
  }

  return {
    name: "README exists",
    status: "fail",
    message: "No README file found in the project root",
  };
}

/**
 * Layer 0 check: at least one recognized source code directory exists.
 */
async function checkSourceCodeDir(
  projectDir: string,
): Promise<AuditCheckResult> {
  for (const dir of SOURCE_CODE_DIRS) {
    const dirPath = join(projectDir, dir);
    const exists = await isDirectory(dirPath);
    if (exists) {
      return {
        name: "Source code directory",
        status: "pass",
        message: `Found source directory: ${dir}/`,
      };
    }
  }

  return {
    name: "Source code directory",
    status: "fail",
    message: `No source directory found (looked for: ${SOURCE_CODE_DIRS.join(", ")})`,
  };
}

/**
 * Runs all Layer 0 checks against the given project directory.
 * Returns an array of results -- one per check.
 */
export async function runLayer0Checks(
  projectDir: string,
): Promise<AuditCheckResult[]> {
  const results: AuditCheckResult[] = [];

  results.push(await checkGitInitialized(projectDir));
  results.push(await checkReadmeExists(projectDir));
  results.push(await checkSourceCodeDir(projectDir));

  return results;
}

/**
 * Displays Layer 0 audit results using @clack/prompts.
 */
function displayResults(results: AuditCheckResult[]): void {
  for (const result of results) {
    if (result.status === "pass") {
      p.log.success(`${result.name}: ${result.message}`);
    } else {
      p.log.error(`${result.name}: ${result.message}`);
    }
  }

  const passed = results.filter((r) => r.status === "pass").length;
  const failed = results.filter((r) => r.status === "fail").length;
  const total = results.length;

  p.note(
    `${passed}/${total} passed, ${failed} failed`,
    "Layer 0 -- Project Prerequisites",
  );
}

/**
 * Prints usage information for the audit command.
 */
function printAuditHelp(): void {
  p.intro("meto-cli audit");
  p.note(
    [
      "Usage: meto-cli audit [options]",
      "",
      "Checks whether your project meets methodology prerequisites.",
      "",
      "Layer 0 (Project Prerequisites):",
      "  - Git initialized",
      "  - README exists",
      "  - Source code directory exists (src/, lib/, app/, etc.)",
      "",
      "Options:",
      "  --help, -h    Show this help message",
    ].join("\n"),
    "Help",
  );
  p.outro("Run 'meto-cli audit' from your project root.");
}

/**
 * Validates that the given directory looks like a project directory.
 * Returns true if it exists and is a directory.
 */
async function isValidProjectDirectory(
  dirPath: string,
): Promise<boolean> {
  return isDirectory(dirPath);
}

/**
 * Entry point for the `meto-cli audit` command.
 * Runs Layer 0 checks against the current working directory and displays results.
 */
export async function runAudit(): Promise<void> {
  const args = process.argv.slice(3);

  if (args.includes("--help") || args.includes("-h")) {
    printAuditHelp();
    return;
  }

  p.intro("meto-cli audit");

  const projectDir = process.cwd();

  const isValid = await isValidProjectDirectory(projectDir);
  if (!isValid) {
    p.log.error(
      "Current directory is not a valid project directory. Run this command from within your project root.",
    );
    p.outro("");
    process.exit(1);
  }

  // Check if directory has any files (not an empty/nonexistent directory)
  let entries: string[];
  try {
    entries = await readdir(projectDir);
  } catch {
    p.log.error(
      "Could not read the current directory. Check permissions and try again.",
    );
    p.outro("");
    process.exit(1);
    return;
  }

  if (entries.length === 0) {
    p.log.error(
      "Current directory is empty. Run this command from within an existing project.",
    );
    p.outro("");
    process.exit(1);
    return;
  }

  p.log.info(`Auditing project at ${projectDir}`);

  const results = await runLayer0Checks(projectDir);
  displayResults(results);

  const hasFail = results.some((r) => r.status === "fail");

  if (hasFail) {
    p.outro("Some prerequisites are missing. Address the issues above before proceeding.");
  } else {
    p.outro("All Layer 0 checks passed.");
  }

  if (hasFail) {
    process.exit(1);
  }
}
