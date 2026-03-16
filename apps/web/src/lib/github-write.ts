/**
 * GitHub API utilities for writing files back to repositories.
 * Uses the Contents API for single-file updates and the Git Trees API
 * for multi-file atomic commits.
 */

interface GitHubFileResponse {
  sha: string;
  content: string;
  encoding: string;
}

/**
 * Gets the current SHA and content of a file from a GitHub repo.
 * Returns null if the file doesn't exist.
 */
async function getFile(
  token: string,
  owner: string,
  repo: string,
  path: string,
): Promise<{ sha: string; content: string } | null> {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    },
  );

  if (!response.ok) return null;

  const data = await response.json() as GitHubFileResponse;
  const content = Buffer.from(data.content, "base64").toString("utf-8");
  return { sha: data.sha, content };
}

/**
 * Updates a single file in a GitHub repo via the Contents API.
 * Creates the file if it doesn't exist.
 */
async function updateFile(
  token: string,
  owner: string,
  repo: string,
  path: string,
  content: string,
  message: string,
  sha?: string,
): Promise<boolean> {
  const body: Record<string, string> = {
    message,
    content: Buffer.from(content).toString("base64"),
  };

  if (sha) {
    body.sha = sha;
  }

  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );

  return response.ok;
}

/**
 * Appends a new task to tasks-todo.md in the repo.
 * Creates the file if it doesn't exist.
 */
export async function createTask(
  token: string,
  owner: string,
  repo: string,
  taskId: string,
  title: string,
  body: string,
): Promise<{ success: boolean; error?: string }> {
  const path = "ai/tasks/tasks-todo.md";
  const file = await getFile(token, owner, repo, path);

  const taskBlock = [
    "",
    `## [${taskId}] ${title}`,
    "",
    body,
    "",
  ].join("\n");

  const newContent = file
    ? file.content.trimEnd() + "\n" + taskBlock
    : `# Todo\n${taskBlock}`;

  const success = await updateFile(
    token,
    owner,
    repo,
    path,
    newContent,
    `chore(board): create ${taskId} in todo [meto-dashboard]`,
    file?.sha,
  );

  if (!success) {
    return { success: false, error: "Failed to write to GitHub" };
  }

  return { success: true };
}

/**
 * Moves a task between board columns by removing it from the source file
 * and appending it to the destination file.
 * Uses two sequential API calls (not atomic, but sufficient for single-user).
 */
export async function moveTask(
  token: string,
  owner: string,
  repo: string,
  taskId: string,
  fromColumn: string,
  toColumn: string,
): Promise<{ success: boolean; error?: string }> {
  const columnFiles: Record<string, string> = {
    backlog: "ai/tasks/tasks-backlog.md",
    todo: "ai/tasks/tasks-todo.md",
    "in-progress": "ai/tasks/tasks-in-progress.md",
    "in-testing": "ai/tasks/tasks-in-testing.md",
    done: "ai/tasks/tasks-done.md",
  };

  const sourcePath = columnFiles[fromColumn];
  const destPath = columnFiles[toColumn];

  if (!sourcePath || !destPath) {
    return { success: false, error: "Invalid column" };
  }

  // Read source file
  const sourceFile = await getFile(token, owner, repo, sourcePath);
  if (!sourceFile) {
    return { success: false, error: `Source file ${sourcePath} not found` };
  }

  // Extract the task block from source
  const { remaining, extracted } = extractTaskBlock(sourceFile.content, taskId);

  if (!extracted) {
    return { success: false, error: `Task ${taskId} not found in ${fromColumn}` };
  }

  // Update source file (remove the task)
  const sourceUpdated = await updateFile(
    token,
    owner,
    repo,
    sourcePath,
    remaining,
    `chore(board): move ${taskId} from ${fromColumn} to ${toColumn} [meto-dashboard]`,
    sourceFile.sha,
  );

  if (!sourceUpdated) {
    return { success: false, error: "Failed to update source file" };
  }

  // Read destination file (re-fetch to get latest SHA after potential race)
  const destFile = await getFile(token, owner, repo, destPath);
  const destContent = destFile
    ? destFile.content.trimEnd() + "\n\n" + extracted.trim() + "\n"
    : `# ${toColumn.charAt(0).toUpperCase() + toColumn.slice(1)}\n\n${extracted.trim()}\n`;

  const destUpdated = await updateFile(
    token,
    owner,
    repo,
    destPath,
    destContent,
    `chore(board): move ${taskId} from ${fromColumn} to ${toColumn} [meto-dashboard]`,
    destFile?.sha,
  );

  if (!destUpdated) {
    return { success: false, error: "Task removed from source but failed to add to destination" };
  }

  return { success: true };
}

/**
 * Extracts a task block from markdown content by task ID.
 * Returns the remaining content and the extracted block.
 */
function extractTaskBlock(
  content: string,
  taskId: string,
): { remaining: string; extracted: string | null } {
  const lines = content.split("\n");
  let inTask = false;
  let taskStart = -1;
  let taskEnd = lines.length;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const isHeading = line.startsWith("## ");

    if (isHeading) {
      if (inTask) {
        taskEnd = i;
        break;
      }

      const idMatch = line.match(/\[?(slice-\d+)\]?/i);
      if (idMatch && idMatch[1]?.toLowerCase() === taskId.toLowerCase()) {
        inTask = true;
        taskStart = i;
      }
    }
  }

  if (taskStart === -1) {
    return { remaining: content, extracted: null };
  }

  const extracted = lines.slice(taskStart, taskEnd).join("\n");
  const before = lines.slice(0, taskStart);
  const after = lines.slice(taskEnd);
  const remaining = [...before, ...after].join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";

  return { remaining, extracted };
}
