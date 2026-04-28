import { TaskDependency } from "./types.js";

const SLICE_ID_PATTERN = /^##\s+\[([^\]]+)\]/m;
const NEEDS_PATTERN = /^\*\*needs:\*\*\s*(.+)$/im;
const BLOCKS_PATTERN = /^\*\*blocks:\*\*\s*(.+)$/im;

function parseListField(raw: string): string[] {
  const trimmed = raw.trim();
  if (trimmed.toLowerCase() === "none") {
    return [];
  }
  return trimmed
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

export function parseTaskDependencies(taskBlock: string): TaskDependency {
  const sliceMatch = SLICE_ID_PATTERN.exec(taskBlock);
  const sliceId = sliceMatch ? sliceMatch[1] : "";

  const needsMatch = NEEDS_PATTERN.exec(taskBlock);
  const needs = needsMatch ? parseListField(needsMatch[1]) : [];

  const blocksMatch = BLOCKS_PATTERN.exec(taskBlock);
  const blocks = blocksMatch ? parseListField(blocksMatch[1]) : [];

  return { sliceId, needs, blocks };
}
