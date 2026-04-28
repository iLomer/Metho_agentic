import fs from "fs/promises";
import { TaskDependency } from "./types.js";
import { parseTaskDependencies } from "./parser.js";

const SLICE_ID_PATTERN = /^##\s+\[([^\]]+)\]/m;

/**
 * Reads tasks-todo.md and tasks-done.md, applies needs-based dependency rules,
 * and returns only the tasks whose dependencies are fully satisfied.
 *
 * - Tasks with empty `needs` are always ready.
 * - If `donePath` does not exist, the done set is treated as empty.
 * - If `todoPath` does not exist, throws with a descriptive message.
 * - Returned tasks are in the order they appear in tasks-todo.md.
 */
export async function getReadyTasks(
  todoPath: string,
  donePath: string
): Promise<TaskDependency[]> {
  // Read todo file — throw if missing
  let todoContent: string;
  try {
    todoContent = await fs.readFile(todoPath, "utf-8");
  } catch {
    throw new Error(`tasks-todo.md not found at: ${todoPath}`);
  }

  // Read done file — treat as empty if missing
  let doneContent = "";
  try {
    doneContent = await fs.readFile(donePath, "utf-8");
  } catch {
    // Missing done file is not fatal — done set stays empty
  }

  // Build done set: collect all slice IDs from done file
  const doneSet = new Set<string>();
  for (const line of doneContent.split("\n")) {
    const match = SLICE_ID_PATTERN.exec(line);
    if (match) {
      doneSet.add(match[1]);
    }
  }

  // Split todo content into blocks by the --- separator
  const blocks = todoContent.split(/\n---\n/);

  // Parse each block and keep only ready tasks (sliceId must be present)
  const readyTasks: TaskDependency[] = [];
  for (const block of blocks) {
    const task = parseTaskDependencies(block);

    // Skip blocks that don't correspond to a real task
    if (!task.sliceId) {
      continue;
    }

    // A task is ready if all its needs are present in the done set
    const isReady = task.needs.every((dep) => doneSet.has(dep));
    if (isReady) {
      readyTasks.push(task);
    }
  }

  return readyTasks;
}
