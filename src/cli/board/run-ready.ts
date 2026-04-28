import { readFile } from "node:fs/promises";
import { join } from "node:path";
import * as p from "@clack/prompts";
import { findProjectRoot } from "../doctor.js";
import { getReadyTasks } from "./resolver.js";

const TASK_HEADING_PATTERN = /^##\s+\[([^\]]+)\]\s*--\s*(.+)$/m;

function printReadyHelp(): void {
  p.intro("meto ready -- show tasks that are unblocked and safe to start");
  p.note(
    [
      "Usage: meto ready [options]",
      "",
      "Options:",
      "  --help, -h   Show this help message",
      "",
      "Reads ai/tasks/tasks-todo.md and ai/tasks/tasks-done.md from the nearest",
      "Meto project root (walking up from cwd) and lists tasks whose Needs:",
      "dependencies are fully satisfied.",
    ].join("\n"),
    "Help",
  );
  p.outro("Run 'meto ready' from inside a Meto project.");
}

/**
 * Builds a map of sliceId → title by scanning blocks in the todo file.
 */
function buildTitleMap(todoContent: string): Map<string, string> {
  const titleMap = new Map<string, string>();
  const blocks = todoContent.split(/\n---\n/);
  for (const block of blocks) {
    const match = TASK_HEADING_PATTERN.exec(block);
    if (match) {
      const sliceId = match[1].trim();
      const title = match[2].trim();
      titleMap.set(sliceId, title);
    }
  }
  return titleMap;
}

/**
 * Counts all task blocks (lines matching ## [slice-) in the todo content.
 */
function countTaskBlocks(todoContent: string): number {
  const blocks = todoContent.split(/\n---\n/);
  return blocks.filter((block) =>
    TASK_HEADING_PATTERN.test(block),
  ).length;
}

export async function runReady(): Promise<void> {
  const args = process.argv.slice(3);

  if (args.includes("--help") || args.includes("-h")) {
    printReadyHelp();
    return;
  }

  const projectRoot = await findProjectRoot(process.cwd());
  if (projectRoot === undefined) {
    p.log.error(
      "Could not find a Meto project. Run this command from inside a Meto project (must have ai/tasks/ directory).",
    );
    process.exit(1);
  }

  const todoPath = join(projectRoot, "ai", "tasks", "tasks-todo.md");
  const donePath = join(projectRoot, "ai", "tasks", "tasks-done.md");

  let readyTasks;
  let todoContent: string;

  try {
    todoContent = await readFile(todoPath, "utf-8");
  } catch {
    p.log.error(
      `tasks-todo.md not found at: ${todoPath}`,
    );
    process.exit(1);
    return;
  }

  const totalTaskCount = countTaskBlocks(todoContent);

  if (totalTaskCount === 0) {
    p.log.info("tasks-todo.md is empty -- nothing to pick up.");
    return;
  }

  try {
    readyTasks = await getReadyTasks(todoPath, donePath);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    p.log.error(message);
    process.exit(1);
    return;
  }

  const titleMap = buildTitleMap(todoContent);

  for (const task of readyTasks) {
    const title = titleMap.get(task.sliceId) ?? task.sliceId;
    p.log.info(`  [${task.sliceId}] ${title}`);
  }

  const readyCount = readyTasks.length;
  const blockedCount = totalTaskCount - readyCount;

  if (blockedCount === 0) {
    p.note(`All ${readyCount} tasks in todo are ready to start.`, "Ready");
  } else {
    p.note(
      `${readyCount} of ${totalTaskCount} tasks are ready. ${blockedCount} task${blockedCount === 1 ? "" : "s"} are waiting on unmet dependencies.`,
      "Ready",
    );
  }
}
