import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import { getStackDescription } from "./stacks.js";
import type { ProjectBrief } from "./types.js";

/**
 * Map of template tokens to their replacement values.
 * Tokens in templates look like {{TOKEN_NAME}}.
 */
export type TokenMap = Record<string, string>;

/**
 * A single rendered file ready to be written to disk.
 */
export interface RenderedFile {
  /** Relative path from the output root (preserves folder structure) */
  relativePath: string;
  /** File content after token replacement */
  content: string;
}

/**
 * Builds a token replacement map from the project brief.
 * Only tokens that the brief can fill are included.
 * Remaining tokens (e.g. {{PROBLEM_STATEMENT}}) are left as-is
 * for the PM agent to populate later.
 */
export function buildTokenMap(brief: ProjectBrief): TokenMap {
  return {
    PROJECT_NAME: brief.projectName,
    PRODUCT_VISION: brief.description,
    TECH_STACK: getStackDescription(brief.techStack, brief.customStack),
    TARGET_USERS: brief.targetUsers,
    PROBLEM_STATEMENT: brief.problemStatement,
    SUCCESS_CRITERIA: brief.successCriteria,
    VALUE_PROPOSITION: brief.valueProposition,
    OUT_OF_SCOPE: brief.outOfScope,
    CODE_CONVENTIONS: brief.codeConventions,
  };
}

/**
 * Replaces all `{{TOKEN}}` occurrences in content using the provided map.
 * Tokens not present in the map are left untouched.
 */
export function replaceTokens(content: string, tokens: TokenMap): string {
  return content.replace(/\{\{([A-Z_]+)\}\}/g, (match, tokenName: string) => {
    if (tokenName in tokens) {
      return tokens[tokenName];
    }
    return match;
  });
}

/**
 * Recursively collects all file paths under a directory.
 * Returns paths relative to the root directory.
 * Includes files inside hidden folders (e.g. `.claude/`).
 */
async function collectFiles(rootDir: string): Promise<string[]> {
  const results: string[] = [];

  async function walk(dir: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile()) {
        results.push(relative(rootDir, fullPath));
      }
    }
  }

  await walk(rootDir);
  return results;
}

/**
 * Resolves the absolute path to the /templates/ directory.
 * Uses the package root (two levels up from dist/cli/renderer.js).
 */
export function resolveTemplatesDir(): string {
  const currentFileUrl = new URL(import.meta.url);
  // At runtime: dist/cli/renderer.js -> package root is ../../
  const packageRoot = new URL("../../", currentFileUrl);
  return join(decodeURIComponent(packageRoot.pathname), "templates");
}

/**
 * Renders all template files by replacing tokens with values from the brief.
 *
 * Reads every file under the templates directory, performs token replacement,
 * and returns an array of RenderedFile objects with their relative paths
 * and rendered content.
 *
 * @param templatesDir - Absolute path to the templates directory
 * @param tokens - Token map for replacements
 * @returns Array of rendered files ready to be written to disk
 */
export async function renderTemplates(
  templatesDir: string,
  tokens: TokenMap,
): Promise<RenderedFile[]> {
  const filePaths = await collectFiles(templatesDir);
  const rendered: RenderedFile[] = [];

  for (const relativePath of filePaths) {
    const absolutePath = join(templatesDir, relativePath);
    const content = await readFile(absolutePath, "utf-8");
    const renderedContent = replaceTokens(content, tokens);

    rendered.push({
      relativePath,
      content: renderedContent,
    });
  }

  return rendered;
}
