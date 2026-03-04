import { mkdir, readdir, writeFile } from "node:fs/promises";
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
 * Writes all rendered template files to the output directory.
 *
 * Creates the output directory and any nested subdirectories as needed.
 * Throws DirectoryNotEmptyError if the target directory already has content.
 *
 * @param outputDir - Absolute or relative path for the scaffold output
 * @param files - Array of rendered files to write
 */
export async function writeScaffold(
  outputDir: string,
  files: RenderedFile[],
): Promise<void> {
  const absoluteOutputDir = resolve(outputDir);

  if (await isNonEmptyDirectory(absoluteOutputDir)) {
    throw new DirectoryNotEmptyError(absoluteOutputDir);
  }

  for (const file of files) {
    const targetPath = join(absoluteOutputDir, file.relativePath);
    const targetDir = dirname(targetPath);

    await mkdir(targetDir, { recursive: true });
    await writeFile(targetPath, file.content, "utf-8");
  }
}
