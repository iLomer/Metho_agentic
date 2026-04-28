import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as p from '@clack/prompts';
import { findProjectRoot } from '../doctor.js';
import { compactDone } from './index.js';

function printCompactHelp(): void {
  p.intro('meto compact -- compact tasks-done.md using Claude Haiku');
  p.note(
    [
      'Usage: meto compact [options]',
      '',
      'Options:',
      '  --dry-run    Preview which tasks would be compacted without writing to disk',
      '  --help, -h   Show this help message',
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

function runDryRun(filePath: string): void {
  let raw: string;
  try {
    raw = readFileSync(filePath, 'utf-8');
  } catch {
    p.log.error(
      'Could not find ai/tasks/tasks-done.md. Run this command from inside a Meto project.',
    );
    process.exit(1);
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

  const projectRoot = await findProjectRoot(process.cwd());
  if (projectRoot === undefined) {
    p.log.error(
      'Could not find ai/tasks/tasks-done.md. Run this command from inside a Meto project.',
    );
    process.exit(1);
  }

  const donePath = join(projectRoot, 'ai', 'tasks', 'tasks-done.md');

  if (isDryRun) {
    runDryRun(donePath);
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
