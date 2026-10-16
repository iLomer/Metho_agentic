/**
 * Installs the meto Claude Code mod (`.claude/skills/meto/`) into a project.
 * Claude Code auto-loads a plugin from a project's `.claude/skills/<name>/`.
 */

import { access, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { resolveTemplatesDir } from "../renderer.js";

/** Where the mod lives, relative to the project root and to templates/. */
export const METO_MOD_DIR = ".claude/skills/meto";

async function listFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFiles(full)));
    } else if (entry.isFile()) {
      files.push(full);
    }
  }
  return files;
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Copies every mod file the project is missing. Never overwrites a file.
 *
 * @returns the project-relative paths written
 */
export async function installMetoMod(
  projectDir: string,
  templatesDir: string = resolveTemplatesDir(),
): Promise<string[]> {
  const sourceDir = join(templatesDir, METO_MOD_DIR);
  const written: string[] = [];

  for (const source of await listFiles(sourceDir)) {
    const rel = relative(templatesDir, source).replace(/\\/g, "/");
    const target = join(projectDir, rel);
    if (await exists(target)) {
      continue;
    }
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, await readFile(source, "utf-8"), "utf-8");
    written.push(rel);
  }

  return written;
}
