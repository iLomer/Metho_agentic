import { access, mkdir, readdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import type { RenderedFile } from "./renderer.js";

/**
 * Error thrown when the output directory already exists and is non-empty.
 */
export class DirectoryNotEmptyError extends Error {
  constructor(dirPath: string) {
    super(
      `Directory "${dirPath}" already exists and is not empty. ` +
        "Choose a different output directory or remove the existing one.",
    );
    this.name = "DirectoryNotEmptyError";
  }
}

/**
 * Checks whether a directory exists and contains files.
 * Returns true if the directory exists and has at least one entry.
 */
async function isNonEmptyDirectory(dirPath: string): Promise<boolean> {
  try {
    const entries = await readdir(dirPath);
    return entries.length > 0;
  } catch {
    // Directory does not exist — that's fine
    return false;
  }
}

/**
 * Checks whether a file exists at the given path.
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export interface WriteScaffoldOptions {
  /** When true, skip files that already exist instead of throwing on non-empty dir. */
  merge?: boolean;
}

/**
 * Writes all rendered template files to the output directory.
 *
 * Creates the output directory and any nested subdirectories as needed.
 * Throws DirectoryNotEmptyError if the target directory already has content
 * (unless merge mode is enabled).
 *
 * In merge mode, existing files are preserved — only new files are written.
 *
 * @param outputDir - Absolute or relative path for the scaffold output
 * @param files - Array of rendered files to write
 * @param options - Optional settings (merge mode)
 * @returns Number of files skipped (0 when not in merge mode)
 */
export async function writeScaffold(
  outputDir: string,
  files: RenderedFile[],
  options: WriteScaffoldOptions = {},
): Promise<number> {
  const absoluteOutputDir = resolve(outputDir);

  if (!options.merge && (await isNonEmptyDirectory(absoluteOutputDir))) {
    throw new DirectoryNotEmptyError(absoluteOutputDir);
  }

  let skipped = 0;

  for (const file of files) {
    const targetPath = join(absoluteOutputDir, file.relativePath);
    const targetDir = dirname(targetPath);

    if (options.merge && (await fileExists(targetPath))) {
      skipped++;
      continue;
    }

    await mkdir(targetDir, { recursive: true });
    await writeFile(targetPath, file.content, "utf-8");
  }

  return skipped;
}
