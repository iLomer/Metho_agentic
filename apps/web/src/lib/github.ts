/**
 * GitHub API utilities for reading repository files.
 */

interface GitHubFileContent {
  content: string;
  encoding: string;
  sha: string;
}

/**
 * Fetches a file's content from a GitHub repo via the Contents API.
 * Returns the decoded UTF-8 content, or null if the file doesn't exist.
 */
export async function fetchFileContent(
  token: string,
  owner: string,
  repo: string,
  path: string,
): Promise<string | null> {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    },
  );

  if (!response.ok) {
    return null;
  }

  const data = await response.json() as GitHubFileContent;

  if (data.encoding === "base64" && data.content) {
    return Buffer.from(data.content, "base64").toString("utf-8");
  }

  return null;
}

/**
 * Checks if a file or directory exists in a GitHub repo.
 */
export async function fileExists(
  token: string,
  owner: string,
  repo: string,
  path: string,
): Promise<boolean> {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
    {
      method: "HEAD",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    },
  );

  return response.ok;
}

/**
 * Checks if a repo has meto methodology (CLAUDE.md + ai/ directory).
 */
export async function hasMeToMethodology(
  token: string,
  owner: string,
  repo: string,
): Promise<boolean> {
  const [hasClaudeMd, hasAiDir] = await Promise.all([
    fileExists(token, owner, repo, "CLAUDE.md"),
    fileExists(token, owner, repo, "ai"),
  ]);

  return hasClaudeMd && hasAiDir;
}

/**
 * Board column names matching the meto task file convention.
 */
const BOARD_COLUMNS = [
  "backlog",
  "todo",
  "in-progress",
  "in-testing",
  "done",
] as const;

export type BoardColumn = (typeof BOARD_COLUMNS)[number];

export interface BoardSummary {
  backlog: number;
  todo: number;
  "in-progress": number;
  "in-testing": number;
  done: number;
}

export interface TaskItem {
  id: string;
  title: string;
  body: string;
  column: BoardColumn;
}

/**
 * Parses meto task markdown into individual tasks.
 * Tasks are delimited by `## ` headings (e.g., `## [slice-001] Title`).
 */
function parseTasksFromMarkdown(content: string, column: BoardColumn): TaskItem[] {
  const tasks: TaskItem[] = [];
  const lines = content.split("\n");
  let currentTask: { id: string; title: string; bodyLines: string[] } | null = null;

  for (const line of lines) {
    const headingMatch = line.match(/^## \[?(slice-\d+)\]?\s*[:\-—]?\s*(.*)/i);
    if (!headingMatch) {
      const altMatch = line.match(/^## (.+)/);
      if (altMatch) {
        // Save previous task
        if (currentTask) {
          tasks.push({
            id: currentTask.id,
            title: currentTask.title,
            body: currentTask.bodyLines.join("\n").trim(),
            column,
          });
        }
        currentTask = {
          id: altMatch[1]?.trim().toLowerCase().replace(/\s+/g, "-") ?? "unknown",
          title: altMatch[1]?.trim() ?? "",
          bodyLines: [],
        };
      } else if (currentTask) {
        currentTask.bodyLines.push(line);
      }
      continue;
    }

    // Save previous task
    if (currentTask) {
      tasks.push({
        id: currentTask.id,
        title: currentTask.title,
        body: currentTask.bodyLines.join("\n").trim(),
        column,
      });
    }

    currentTask = {
      id: headingMatch[1] ?? "unknown",
      title: headingMatch[2]?.trim() ?? headingMatch[1] ?? "Untitled",
      bodyLines: [],
    };
  }

  // Save last task
  if (currentTask) {
    tasks.push({
      id: currentTask.id,
      title: currentTask.title,
      body: currentTask.bodyLines.join("\n").trim(),
      column,
    });
  }

  return tasks;
}

/**
 * Reads all board files from a repo and returns tasks grouped by column,
 * plus a summary of counts per column.
 */
export async function readBoard(
  token: string,
  owner: string,
  repo: string,
): Promise<{ tasks: TaskItem[]; summary: BoardSummary }> {
  const fileMap: Record<BoardColumn, string> = {
    backlog: "ai/tasks/tasks-backlog.md",
    todo: "ai/tasks/tasks-todo.md",
    "in-progress": "ai/tasks/tasks-in-progress.md",
    "in-testing": "ai/tasks/tasks-in-testing.md",
    done: "ai/tasks/tasks-done.md",
  };

  const allTasks: TaskItem[] = [];
  const summary: BoardSummary = {
    backlog: 0,
    todo: 0,
    "in-progress": 0,
    "in-testing": 0,
    done: 0,
  };

  const results = await Promise.all(
    BOARD_COLUMNS.map(async (column) => {
      const content = await fetchFileContent(token, owner, repo, fileMap[column]);
      if (!content) return { column, tasks: [] };
      const tasks = parseTasksFromMarkdown(content, column);
      return { column, tasks };
    }),
  );

  for (const { column, tasks } of results) {
    allTasks.push(...tasks);
    summary[column] = tasks.length;
  }

  return { tasks: allTasks, summary };
}

/**
 * Runs a simplified health check against a repo's file structure.
 * Returns a score from 0-100 and per-layer results.
 */
export async function checkHealth(
  token: string,
  owner: string,
  repo: string,
): Promise<{ score: number; layers: { id: number; name: string; passed: number; total: number }[] }> {
  // Layer 0: Project basics
  const [hasGit, hasSrc] = await Promise.all([
    fileExists(token, owner, repo, ".git"),
    Promise.any([
      fileExists(token, owner, repo, "src"),
      fileExists(token, owner, repo, "lib"),
      fileExists(token, owner, repo, "app"),
      fileExists(token, owner, repo, "pkg"),
    ]).catch(() => false),
  ]);
  const l0Passed = [hasGit, hasSrc].filter(Boolean).length;

  // Layer 1: Methodology
  const l1Checks = await Promise.all([
    fileExists(token, owner, repo, "CLAUDE.md"),
    fileExists(token, owner, repo, "ai"),
    fileExists(token, owner, repo, "ai/context/product-vision.md"),
    fileExists(token, owner, repo, "ai/context/tech-stack.md"),
    fileExists(token, owner, repo, "ai/context/decisions.md"),
    fileExists(token, owner, repo, "ai/tasks"),
    fileExists(token, owner, repo, "ai/tasks/tasks-todo.md"),
    fileExists(token, owner, repo, "ai/tasks/tasks-done.md"),
    fileExists(token, owner, repo, "ai/workflows/definition-of-done.md"),
  ]);
  const l1Passed = l1Checks.filter(Boolean).length;

  // Layer 2: Agents
  const l2Checks = await Promise.all([
    fileExists(token, owner, repo, ".claude"),
    fileExists(token, owner, repo, ".claude/settings.json"),
    fileExists(token, owner, repo, ".claude/agents/pm-agent.md"),
    fileExists(token, owner, repo, ".claude/agents/developer-agent.md"),
    fileExists(token, owner, repo, ".claude/agents/tester-agent.md"),
  ]);
  const l2Passed = l2Checks.filter(Boolean).length;

  // Layer 3: Governance
  const l3Checks = await Promise.all([
    fileExists(token, owner, repo, "ai/workflows/definition-of-done.md"),
    fileExists(token, owner, repo, "ai/workflows/code-guidelines.md"),
    fileExists(token, owner, repo, "ai/workflows/session-checkpoint.md"),
    fileExists(token, owner, repo, "ai/workflows/commit-conventions.md"),
  ]);
  const l3Passed = l3Checks.filter(Boolean).length;

  const totalPassed = l0Passed + l1Passed + l2Passed + l3Passed;
  const totalChecks = 2 + l1Checks.length + l2Checks.length + l3Checks.length;
  const score = Math.round((totalPassed / totalChecks) * 100);

  return {
    score,
    layers: [
      { id: 0, name: "Project Basics", passed: l0Passed, total: 2 },
      { id: 1, name: "Methodology", passed: l1Passed, total: l1Checks.length },
      { id: 2, name: "Agents", passed: l2Passed, total: l2Checks.length },
      { id: 3, name: "Governance", passed: l3Passed, total: l3Checks.length },
    ],
  };
}
