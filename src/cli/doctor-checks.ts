import { readFile, readdir, access } from "node:fs/promises";
import { join } from "node:path";

/**
 * Result of a single health check performed by the doctor command.
 */
export interface HealthCheckResult {
  /** Human-readable name of the check */
  name: string;
  /** Whether the check passed, produced a warning, or failed */
  status: "pass" | "warn" | "fail";
  /** Descriptive message explaining the result */
  message: string;
}

/**
 * Files that must exist in every Meto-scaffolded project.
 */
const REQUIRED_FILES: readonly string[] = [
  "CLAUDE.md",
  "ai/context/product-vision.md",
  "ai/context/tech-stack.md",
  "ai/context/decisions.md",
  "ai/backlog/epics.md",
  "ai/tasks/tasks-backlog.md",
  "ai/tasks/tasks-todo.md",
  "ai/tasks/tasks-in-progress.md",
  "ai/tasks/tasks-in-testing.md",
  "ai/tasks/tasks-done.md",
  "ai/workflows/definition-of-done.md",
];

/**
 * Context files that should have meaningful content (more than 2 lines).
 */
const CONTEXT_FILES: readonly string[] = [
  "ai/context/product-vision.md",
  "ai/context/tech-stack.md",
];

/**
 * Board files that should start with a # heading.
 */
const BOARD_FILES: readonly string[] = [
  "ai/tasks/tasks-backlog.md",
  "ai/tasks/tasks-todo.md",
  "ai/tasks/tasks-in-progress.md",
  "ai/tasks/tasks-in-testing.md",
  "ai/tasks/tasks-done.md",
];

/**
 * Agent definition files that must exist in .claude/agents/.
 */
const REQUIRED_AGENTS: readonly string[] = [
  "pm-agent.md",
  "developer-agent.md",
  "tester-agent.md",
];

/**
 * Checks whether a file exists at the given path.
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Safely reads a file, returning undefined if the file does not exist.
 */
async function safeReadFile(filePath: string): Promise<string | undefined> {
  try {
    return await readFile(filePath, "utf-8");
  } catch {
    return undefined;
  }
}

/**
 * Extracts all task slice identifiers (e.g. "slice-001") from a markdown file's
 * ## [slice-NNN] headings.
 */
export function extractSliceIds(content: string): string[] {
  const matches = content.match(/## \[slice-\d+\]/g);
  if (matches === null) {
    return [];
  }
  return matches.map((m) => {
    const idMatch = /\[slice-\d+\]/.exec(m);
    return idMatch ? idMatch[0] : "";
  }).filter((id) => id.length > 0);
}

/**
 * Check 1: Required files exist.
 * Each required file that is missing produces a "fail" result.
 */
export async function checkRequiredFiles(
  projectRoot: string,
): Promise<HealthCheckResult[]> {
  const results: HealthCheckResult[] = [];

  for (const file of REQUIRED_FILES) {
    const exists = await fileExists(join(projectRoot, file));
    if (exists) {
      results.push({
        name: `Required file: ${file}`,
        status: "pass",
        message: "File exists",
      });
    } else {
      results.push({
        name: `Required file: ${file}`,
        status: "fail",
        message: `Missing required file: ${file}`,
      });
    }
  }

  return results;
}

/**
 * Check 2: Context files are not empty.
 * Files with 2 or fewer lines of content produce a "warn" result.
 */
export async function checkContextFilesNotEmpty(
  projectRoot: string,
): Promise<HealthCheckResult[]> {
  const results: HealthCheckResult[] = [];

  for (const file of CONTEXT_FILES) {
    const content = await safeReadFile(join(projectRoot, file));
    if (content === undefined) {
      // File missing is caught by checkRequiredFiles; skip here
      continue;
    }

    const lines = content.split("\n").filter((line) => line.trim().length > 0);
    if (lines.length > 2) {
      results.push({
        name: `Content check: ${file}`,
        status: "pass",
        message: "File has meaningful content",
      });
    } else {
      results.push({
        name: `Content check: ${file}`,
        status: "warn",
        message: `${file} has ${lines.length} non-empty lines -- expected more than 2`,
      });
    }
  }

  return results;
}

/**
 * Check 3: Board files start with a # heading.
 */
export async function checkBoardFileFormat(
  projectRoot: string,
): Promise<HealthCheckResult[]> {
  const results: HealthCheckResult[] = [];

  for (const file of BOARD_FILES) {
    const content = await safeReadFile(join(projectRoot, file));
    if (content === undefined) {
      // File missing is caught by checkRequiredFiles; skip here
      continue;
    }

    const firstLine = content.trimStart().split("\n")[0];
    if (firstLine.startsWith("# ")) {
      results.push({
        name: `Board format: ${file}`,
        status: "pass",
        message: "File starts with a heading",
      });
    } else {
      results.push({
        name: `Board format: ${file}`,
        status: "warn",
        message: `${file} does not start with a # heading`,
      });
    }
  }

  return results;
}

/**
 * Check 4: Epics file has content (at least one ## E heading).
 */
export async function checkEpicsFileHasContent(
  projectRoot: string,
): Promise<HealthCheckResult[]> {
  const content = await safeReadFile(join(projectRoot, "ai/backlog/epics.md"));
  if (content === undefined) {
    // File missing is caught by checkRequiredFiles; skip here
    return [];
  }

  const hasEpicHeading = /## E/.test(content);
  if (hasEpicHeading) {
    return [
      {
        name: "Epics file content",
        status: "pass",
        message: "Epics file contains at least one epic",
      },
    ];
  }

  return [
    {
      name: "Epics file content",
      status: "warn",
      message: "epics.md does not contain any ## E headings",
    },
  ];
}

/**
 * Check 5: Agent definitions exist in .claude/agents/.
 */
export async function checkAgentDefinitions(
  projectRoot: string,
): Promise<HealthCheckResult[]> {
  const results: HealthCheckResult[] = [];
  const agentsDir = join(projectRoot, ".claude", "agents");

  let agentFiles: string[];
  try {
    agentFiles = await readdir(agentsDir);
  } catch {
    // Directory doesn't exist -- all agents are missing
    for (const agent of REQUIRED_AGENTS) {
      results.push({
        name: `Agent definition: ${agent}`,
        status: "fail",
        message: `Missing agent definition: .claude/agents/${agent}`,
      });
    }
    return results;
  }

  for (const agent of REQUIRED_AGENTS) {
    if (agentFiles.includes(agent)) {
      results.push({
        name: `Agent definition: ${agent}`,
        status: "pass",
        message: "Agent definition exists",
      });
    } else {
      results.push({
        name: `Agent definition: ${agent}`,
        status: "fail",
        message: `Missing agent definition: .claude/agents/${agent}`,
      });
    }
  }

  return results;
}

/**
 * Check 6: In-progress limit (max 1 task in tasks-in-progress.md).
 */
export async function checkInProgressLimit(
  projectRoot: string,
): Promise<HealthCheckResult[]> {
  const content = await safeReadFile(
    join(projectRoot, "ai/tasks/tasks-in-progress.md"),
  );
  if (content === undefined) {
    return [];
  }

  const sliceIds = extractSliceIds(content);
  const count = sliceIds.length;

  if (count <= 1) {
    return [
      {
        name: "WIP limit",
        status: "pass",
        message: `${count} task(s) in progress`,
      },
    ];
  }

  return [
    {
      name: "WIP limit",
      status: "warn",
      message: `WIP limit exceeded: ${count} tasks in progress, expected max 1.`,
    },
  ];
}

/**
 * Check 7: No orphan tasks (tasks in in-progress or in-testing must exist in backlog).
 */
export async function checkNoOrphanTasks(
  projectRoot: string,
): Promise<HealthCheckResult[]> {
  const backlogContent = await safeReadFile(
    join(projectRoot, "ai/tasks/tasks-backlog.md"),
  );
  const inProgressContent = await safeReadFile(
    join(projectRoot, "ai/tasks/tasks-in-progress.md"),
  );
  const inTestingContent = await safeReadFile(
    join(projectRoot, "ai/tasks/tasks-in-testing.md"),
  );

  if (backlogContent === undefined) {
    return [];
  }

  const backlogIds = extractSliceIds(backlogContent);
  const activeTasks: Array<{ id: string; source: string }> = [];

  if (inProgressContent !== undefined) {
    for (const id of extractSliceIds(inProgressContent)) {
      activeTasks.push({ id, source: "tasks-in-progress.md" });
    }
  }

  if (inTestingContent !== undefined) {
    for (const id of extractSliceIds(inTestingContent)) {
      activeTasks.push({ id, source: "tasks-in-testing.md" });
    }
  }

  if (activeTasks.length === 0) {
    return [
      {
        name: "Orphan tasks",
        status: "pass",
        message: "No active tasks to check",
      },
    ];
  }

  const results: HealthCheckResult[] = [];
  let hasOrphan = false;

  for (const task of activeTasks) {
    if (!backlogIds.includes(task.id)) {
      hasOrphan = true;
      results.push({
        name: `Orphan task: ${task.id}`,
        status: "warn",
        message: `${task.id} in ${task.source} has no matching entry in tasks-backlog.md`,
      });
    }
  }

  if (!hasOrphan) {
    results.push({
      name: "Orphan tasks",
      status: "pass",
      message: "All active tasks have backlog entries",
    });
  }

  return results;
}

/**
 * Runs all methodology health checks against the given project root.
 * Returns an array of check results -- one per individual check.
 */
export async function runHealthChecks(
  projectRoot: string,
): Promise<HealthCheckResult[]> {
  const allResults: HealthCheckResult[] = [];

  const checkFunctions = [
    checkRequiredFiles,
    checkContextFilesNotEmpty,
    checkBoardFileFormat,
    checkEpicsFileHasContent,
    checkAgentDefinitions,
    checkInProgressLimit,
    checkNoOrphanTasks,
  ];

  for (const checkFn of checkFunctions) {
    const results = await checkFn(projectRoot);
    allResults.push(...results);
  }

  return allResults;
}
