import Anthropic from '@anthropic-ai/sdk';

export type CompactResult = {
  originalTaskCount: number;
  compactedTaskCount: number;
  outputPath: string;
};

// Re-export Anthropic so downstream slices can import from this module
export { Anthropic };

export async function compactDone(filePath: string): Promise<void> {
  throw new Error('not implemented');
}
