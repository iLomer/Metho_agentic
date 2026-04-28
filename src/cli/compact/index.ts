import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

export type CompactResult = {
  originalTaskCount: number;
  compactedTaskCount: number;
  outputPath: string;
};

// Re-export Anthropic so downstream slices can import from this module
export { Anthropic };

export const COMPACT_PROMPT =
  'You are a technical writer summarizing completed software development tasks. ' +
  'Produce a single-paragraph summary of no more than 3 sentences. ' +
  'Preserve: the slice ID, the epic identifier, what was built, and the outcome. ' +
  'Be concise and factual. Output only the summary paragraph — no headings, no bullet points, no preamble.';

function extractSliceHeader(block: string): string {
  const firstLine = block.split('\n')[0] ?? '';
  const match = firstLine.match(/^##\s+(\[slice-\S+\])\s+--\s+(.+)$/);
  if (!match) return firstLine.replace(/^##\s+/, '').trim();
  return `${match[1]} -- ${match[2].trim()}`;
}

function extractEpic(block: string): string {
  const lines = block.split('\n');
  for (const line of lines) {
    const match = line.match(/\*\*Epic:\*\*\s+(\S+)/);
    if (match) return match[1] ?? 'E?';
  }
  return 'E?';
}

async function summarizeBlock(client: Anthropic, block: string): Promise<string> {
  const response = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 200,
    messages: [
      {
        role: 'user',
        content: `${COMPACT_PROMPT}\n\nTask block:\n\n${block}`,
      },
    ],
  });

  const contentBlock = response.content[0];
  if (!contentBlock || contentBlock.type !== 'text') {
    return 'Summary unavailable.';
  }
  return contentBlock.text.trim();
}

export async function compactDone(filePath: string): Promise<CompactResult> {
  const apiKey = process.env['ANTHROPIC_API_KEY'];
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is required for meto compact');
  }

  const outputPath = resolve(filePath);
  const raw = readFileSync(outputPath, 'utf-8');

  // Split on the `\n---\n` separator used in all board files
  const segments = raw.split('\n---\n');

  // Separate preamble (non-task-block segments) from task blocks
  const preambleSegments: string[] = [];
  const taskBlocks: string[] = [];

  for (const segment of segments) {
    const trimmed = segment.trimStart();
    if (trimmed.startsWith('## [slice-')) {
      taskBlocks.push(segment);
    } else {
      preambleSegments.push(segment);
    }
  }

  const originalTaskCount = taskBlocks.length;

  const client = new Anthropic({ apiKey });

  const compactedBlocks: string[] = [];
  for (const block of taskBlocks) {
    const header = extractSliceHeader(block);
    const epic = extractEpic(block);
    const summary = await summarizeBlock(client, block.trim());

    const compacted =
      `## ${header} (COMPACTED)\n` +
      `Epic: ${epic} | Outcome: ${summary}`;

    compactedBlocks.push(compacted);
  }

  // Reconstruct: preamble segments joined by `\n---\n`, then each task block separated by `\n---\n`
  const preamblePart = preambleSegments.join('\n---\n');
  const taskPart = compactedBlocks.join('\n---\n');

  let output: string;
  if (preamblePart.endsWith('\n')) {
    output = preamblePart + '---\n\n' + taskPart + '\n';
  } else {
    output = preamblePart + '\n---\n\n' + taskPart + '\n';
  }

  writeFileSync(outputPath, output, 'utf-8');

  return {
    originalTaskCount,
    compactedTaskCount: compactedBlocks.length,
    outputPath,
  };
}
