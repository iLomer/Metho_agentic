import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { TaskItem, BoardSummary } from "./types.js";

const COLUMNS = ["backlog", "todo", "in-progress", "in-testing", "done"] as const;

const COLUMN_FILES: Record<(typeof COLUMNS)[number], string> = {
  backlog: "ai/tasks/tasks-backlog.md",
  todo: "ai/tasks/tasks-todo.md",
  "in-progress": "ai/tasks/tasks-in-progress.md",
  "in-testing": "ai/tasks/tasks-in-testing.md",
  done: "ai/tasks/tasks-done.md",
};

/**
 * Reads a file, returning empty string if it doesn't exist.
 */
async function safeRead(path: string): Promise<string> {
  try {
    return await readFile(path, "utf-8");
  } catch {
    return "";
  }
}

/**
 * Parses tasks from meto markdown format.
 */
function parseTasks(content: string, column: string): TaskItem[] {
  const tasks: TaskItem[] = [];
  const lines = content.split("\n");
  let current: { id: string; title: string; bodyLines: string[] } | null = null;

  for (const line of lines) {
    const sliceMatch = line.match(/^## \[?(slice-\d+)\]?\s*[:\-—]?\s*(.*)/i);
    if (sliceMatch) {
      if (current) {
        tasks.push({ id: current.id, title: current.title, body: current.bodyLines.join("\n").trim(), column });
      }
      current = { id: sliceMatch[1] ?? "unknown", title: sliceMatch[2]?.trim() ?? "", bodyLines: [] };
    } else if (line.startsWith("## ") && current) {
      tasks.push({ id: current.id, title: current.title, body: current.bodyLines.join("\n").trim(), column });
      const altTitle = line.replace(/^## /, "").trim();
      current = { id: altTitle.toLowerCase().replace(/\s+/g, "-"), title: altTitle, bodyLines: [] };
    } else if (current) {
      current.bodyLines.push(line);
    }
  }

  if (current) {
    tasks.push({ id: current.id, title: current.title, body: current.bodyLines.join("\n").trim(), column });
  }

  return tasks;
}

/**
 * Reads the full board from a project's local filesystem.
 */
export async function readBoard(projectPath: string): Promise<{ tasks: TaskItem[]; summary: BoardSummary }> {
  const allTasks: TaskItem[] = [];
  const summary: BoardSummary = { backlog: 0, todo: 0, "in-progress": 0, "in-testing": 0, done: 0 };

  for (const column of COLUMNS) {
    const file = COLUMN_FILES[column];
    const filePath = join(projectPath, file);
    const content = await safeRead(filePath);
    const tasks = parseTasks(content, column);
    allTasks.push(...tasks);
    summary[column] = tasks.length;
  }

  return { tasks: allTasks, summary };
}

/**
 * Creates a new task by appending to tasks-todo.md.
 */
export async function createTask(
  projectPath: string,
  taskId: string,
  title: string,
  body: string,
): Promise<{ success: boolean; error?: string }> {
  const filePath = join(projectPath, COLUMN_FILES["todo"]);
  const existing = await safeRead(filePath);

  const taskBlock = `\n## [${taskId}] ${title}\n\n${body}\n`;
  const newContent = existing.trimEnd() + "\n" + taskBlock;

  try {
    await writeFile(filePath, newContent, "utf-8");
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: msg };
  }
}

/**
 * Moves a task between board columns by editing local files.
 */
export async function moveTask(
  projectPath: string,
  taskId: string,
  fromColumn: string,
  toColumn: string,
): Promise<{ success: boolean; error?: string }> {
  const sourceFile = COLUMN_FILES[fromColumn as (typeof COLUMNS)[number]];
  const destFile = COLUMN_FILES[toColumn as (typeof COLUMNS)[number]];

  if (!sourceFile || !destFile) {
    return { success: false, error: "Invalid column" };
  }

  const sourcePath = join(projectPath, sourceFile);
  const destPath = join(projectPath, destFile);

  const sourceContent = await safeRead(sourcePath);
  const { remaining, extracted } = extractTaskBlock(sourceContent, taskId);

  if (!extracted) {
    return { success: false, error: `Task ${taskId} not found in ${fromColumn}` };
  }

  try {
    await writeFile(sourcePath, remaining, "utf-8");

    const destContent = await safeRead(destPath);
    const newDest = destContent.trimEnd() + "\n\n" + extracted.trim() + "\n";
    await writeFile(destPath, newDest, "utf-8");

    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: msg };
  }
}

function extractTaskBlock(content: string, taskId: string): { remaining: string; extracted: string | null } {
  const lines = content.split("\n");
  let inTask = false;
  let taskStart = -1;
  let taskEnd = lines.length;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (line.startsWith("## ")) {
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
  const remaining = [...lines.slice(0, taskStart), ...lines.slice(taskEnd)]
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim() + "\n";

  return { remaining, extracted };
}
