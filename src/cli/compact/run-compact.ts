import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as p from '@clack/prompts';
import { findProjectRoot } from '../doctor.js';
import { compactDone } from './index.js';

const DEFAULT_MIN_TASKS = 20;

/**
 * Parses the --min-tasks flag from the given args array.
 * Supports both --min-tasks=N and --min-tasks N forms.
 * Returns DEFAULT_MIN_TASKS when the flag is absent or its value is not a valid integer.
 */
export function parseMinTasks(args: string[]): number {
  for (let i = 0; i < args.length; i++) {
    const arg = args[i] ?? '';

    // --min-tasks=N form
    if (arg.startsWith('--min-tasks=')) {
      const raw = arg.slice('--min-tasks='.length);
      const parsed = parseInt(raw, 10);
      return Number.isNaN(parsed) ? DEFAULT_MIN_TASKS : parsed;
    }

    // --min-tasks N form
    if (arg === '--min-tasks') {
      const next = args[i + 1];
      if (next === undefined) return DEFAULT_MIN_TASKS;
      const parsed = parseInt(next, 10);
      return Number.isNaN(parsed) ? DEFAULT_MIN_TASKS : parsed;
    }
  }
  return DEFAULT_MIN_TASKS;
}

/**
 * Counts the number of task blocks in the raw markdown content of a board file.
 * A task block is any line that starts with "## [slice-".
 */
export function countTaskBlocks(raw: string): number {
  const lines = raw.split('\n');
  return lines.filter((line) => line.startsWith('## [slice-')).length;
}

function printCompactHelp(): void {
  p.intro('meto compact -- compact tasks-done.md using Claude Haiku');
  p.note(
    [
      'Usage: meto compact [options]',
      '',
      'Options:',
      `  --min-tasks=N  Skip compaction when tasks-done.md has fewer than N tasks (default: ${DEFAULT_MIN_TASKS})`,
      '  --dry-run      Preview which tasks would be compacted without writing to disk',
      '  --help, -h     Show this help message',
      '',
      'Reads ai/tasks/tasks-done.md from the nearest Meto project root (walking up',
      'from cwd) and compacts completed task blocks into single-line summaries using',
      'the Anthropic API.',
      '',
      'Requires: ANTHROPIC_API_KEY environment variable',
    ].join('\n'),
    'Help',
  );
  p.outro("Run 'meto compact' from inside a Meto project.");
}

function countLines(text: string): number {
  return text.split('\n').length;
}

function extractTaskBlocks(raw: string): string[] {
  const segments = raw.split('\n---\n');
  return segments.filter((seg) => seg.trimStart().startsWith('## [slice-'));
}

function extractSliceId(block: string): string {
  const firstLine = block.split('\n')[0] ?? '';
  const match = firstLine.match(/^##\s+(\[slice-[^\]]+\])/);
  return match?.[1] ?? firstLine.replace(/^##\s+/, '').trim();
}

function runDryRun(filePath: string, minTasks: number): void {
  let raw: string;
  try {
    raw = readFileSync(filePath, 'utf-8');
  } catch {
    p.log.error(
      'Could not find ai/tasks/tasks-done.md. Run this command from inside a Meto project.',
    );
    process.exit(1);
    return;
  }

  const taskCount = countTaskBlocks(raw);

  if (taskCount < minTasks) {
    p.log.info(
      `tasks-done.md has ${taskCount} tasks (threshold: ${minTasks}). Skipping compaction.`,
    );
    return;
  }

  const taskBlocks = extractTaskBlocks(raw);
  if (taskBlocks.length === 0) {
    p.log.info('tasks-done.md contains no task blocks. Nothing to compact.');
    return;
  }

  const lines: string[] = [];
  for (const block of taskBlocks) {
    const sliceId = extractSliceId(block);
    const lineCount = countLines(block.trim());
    lines.push(`  ${sliceId}  (${lineCount} lines)`);
  }

  p.note(
    [
      `Would compact ${taskBlocks.length} task${taskBlocks.length === 1 ? '' : 's'}:`,
      '',
      ...lines,
    ].join('\n'),
    'Dry Run Preview',
  );
  p.outro('No files written. Remove --dry-run to run compaction.');
}

export async function runCompact(): Promise<void> {
  const args = process.argv.slice(3);

  if (args.includes('--help') || args.includes('-h')) {
    printCompactHelp();
    return;
  }

  const isDryRun = args.includes('--dry-run');
  const minTasks = parseMinTasks(args);

  const projectRoot = await findProjectRoot(process.cwd());
  if (projectRoot === undefined) {
    p.log.error(
      'Could not find ai/tasks/tasks-done.md. Run this command from inside a Meto project.',
    );
    process.exit(1);
    return;
  }

  const donePath = join(projectRoot, 'ai', 'tasks', 'tasks-done.md');

  if (isDryRun) {
    runDryRun(donePath, minTasks);
    return;
  }

  let raw: string;
  try {
    raw = readFileSync(donePath, 'utf-8');
  } catch {
    p.log.error(
      'Could not find ai/tasks/tasks-done.md. Run this command from inside a Meto project.',
    );
    process.exit(1);
    return;
  }

  const taskCount = countTaskBlocks(raw);
  if (taskCount < minTasks) {
    p.log.info(
      `tasks-done.md has ${taskCount} tasks (threshold: ${minTasks}). Skipping compaction.`,
    );
    return;
  }

  const spinner = p.spinner();
  spinner.start('Compacting tasks-done.md...');

  try {
    const result = await compactDone(donePath);
    spinner.stop('Done.');
    p.log.success(`Compacted ${result.originalTaskCount} tasks in tasks-done.md`);
  } catch (error: unknown) {
    spinner.stop('Compaction failed.');
    const message = error instanceof Error ? error.message : 'Unknown error';
    p.log.error(message);
    process.exit(1);
  }
}
