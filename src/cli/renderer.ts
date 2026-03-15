import { readdir, readFile } from "node:fs/promises";
import { basename, dirname, join, relative } from "node:path";
import {
  getCodeGuidelines,
  getDefinitionOfDone,
  getStackDescription,
  getStarterEpics,
} from "./stacks.js";
import type { ProjectBrief, WorkflowMode } from "./types.js";
import type { AIGeneratedContent } from "./ai-parser.js";

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
 * Generates the Agents section for CLAUDE.md based on workflow mode.
 * Sprint mode includes the standard 3-agent table.
 * Swarm mode adds a swarm agent table with epic-agent references and swarm file references.
 */
export function buildWorkflowAgentsSection(
  workflowMode: WorkflowMode,
): string {
  const sprintSection = [
    "## Agents",
    "",
    "Human orchestrator reads the board and calls the right agent.",
    "",
    "| Agent | Owns |",
    "|---|---|",
    "| `@meto-pm` | `/ai/backlog/`, `tasks-backlog.md`, `tasks-todo.md` |",
    "| `@meto-developer` | `/src/`, `tasks-in-progress.md`, `tasks-in-testing.md` |",
    "| `@meto-tester` | `tasks-in-testing.md` → done or back to todo |",
    "| `@meto-community` | Community engagement, user communication, market awareness |",
    "",
    "Each agent has a memory file in `.claude/agent-memory/` — read at session start, update at session end.",
  ];

  if (workflowMode === "sprint") {
    return sprintSection.join("\n");
  }

  const swarmSection = [
    ...sprintSection,
    "",
    "### Swarm Mode Agents",
    "",
    "This project uses **swarm mode** -- parallel epic agents working on independent domains.",
    "",
    "**Critical rules:**",
    "- The lead agent (you) orchestrates only -- NEVER implement tasks directly. Always delegate: `@meto-pm` for planning, `@meto-epic-[id]` for building, `@meto-tester` for validation.",
    "- Epic agents run independent tasks in parallel (background agents/worktrees). Only sequential when there is a dependency chain.",
    "",
    "| Agent | Owns |",
    "|---|---|",
    "| `@meto-pm` | Planning, epics, swarm init, `ai/swarm/domain-map.md` |",
    "| `@meto-epic-[id]` | One per epic, scoped to its domain -- the ONLY agents that write code |",
    "| `@meto-tester` | Validates all epics sequentially |",
    "",
    "See `ai/swarm/domain-map.md` for epic ownership.",
    "",
    "See `ai/workflows/swarm-workflow.md` for rhythm.",
    "",
    "Run `npx meto-cli status` at any time to see swarm progress in the terminal.",
  ];

  return swarmSection.join("\n");
}

/**
 * Builds a token replacement map from the project brief.
 * When AI-generated content is provided, it overrides the brief's static fields
 * for PRODUCT_VISION, PROBLEM_STATEMENT, SUCCESS_CRITERIA, VALUE_PROPOSITION,
 * OUT_OF_SCOPE, DEFINITION_OF_DONE, STARTER_EPICS, and STARTER_TASKS.
 * PROJECT_NAME, TARGET_USERS, TECH_STACK, and CODE_CONVENTIONS always come from the brief.
 * WORKFLOW_AGENTS_SECTION is generated based on the brief's workflowMode.
 */
export function buildTokenMap(
  brief: ProjectBrief,
  aiContent?: AIGeneratedContent,
): TokenMap {
  const workflowAgentsSection = buildWorkflowAgentsSection(
    brief.workflowMode ?? "sprint",
  );

  if (aiContent !== undefined) {
    return {
      PROJECT_NAME: brief.projectName,
      PRODUCT_VISION: aiContent.productVision,
      TECH_STACK: getStackDescription(brief.techStack, brief.customStack),
      TARGET_USERS: brief.targetUsers,
      PROBLEM_STATEMENT: aiContent.problemStatement,
      SUCCESS_CRITERIA: aiContent.successCriteria,
      VALUE_PROPOSITION: aiContent.valueProposition,
      OUT_OF_SCOPE: aiContent.outOfScope,
      CODE_CONVENTIONS: brief.codeConventions,
      CODE_GUIDELINES_STACK: getCodeGuidelines(brief.techStack, brief.customStack),
      DEFINITION_OF_DONE: aiContent.definitionOfDone,
      STARTER_EPICS: aiContent.epics,
      STARTER_TASKS: aiContent.starterTasks,
      WORKFLOW_AGENTS_SECTION: workflowAgentsSection,
    };
  }

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
    CODE_GUIDELINES_STACK: getCodeGuidelines(brief.techStack, brief.customStack),
    DEFINITION_OF_DONE: getDefinitionOfDone(brief.techStack, brief.customStack),
    STARTER_EPICS: getStarterEpics(
      brief.techStack,
      brief.projectName,
      brief.customStack,
    ),
    STARTER_TASKS: "",
    WORKFLOW_AGENTS_SECTION: workflowAgentsSection,
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
 * Renames used in templates to work around npm pack exclusions.
 * npm strips `.gitignore` files from tarballs, so we store them
 * without the dot prefix and restore it at render time.
 *
 * Key: filename as stored in templates/ (no dot)
 * Value: filename as written to the output directory (with dot)
 */
const TEMPLATE_RENAMES: Record<string, string> = {
  gitignore: ".gitignore",
};

/**
 * Applies template filename renames to a relative path.
 * Only the basename is checked — directory components are left untouched.
 */
function applyTemplateRenames(relativePath: string): string {
  const name = basename(relativePath);
  if (name in TEMPLATE_RENAMES) {
    const dir = dirname(relativePath);
    const renamed = TEMPLATE_RENAMES[name];
    return dir === "." ? renamed : join(dir, renamed);
  }
  return relativePath;
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
 * Paths that are only included when workflow mode is "swarm".
 * These are the swarm-specific template directories/files.
 */
const SWARM_ONLY_PATHS = [
  "ai/swarm/",
  "ai/workflows/swarm-workflow.md",
];

/**
 * The epic-agent template is used as a base for dynamic generation
 * (one per epic), never rendered directly into the scaffold.
 */
const EPIC_AGENT_TEMPLATE_PATH = ".claude/agents/epic-agent.md";

/**
 * Checks whether a relative path belongs to swarm-only content.
 */
function isSwarmOnlyPath(relativePath: string): boolean {
  const normalized = relativePath.replace(/\\/g, "/");
  return SWARM_ONLY_PATHS.some((prefix) => normalized.startsWith(prefix));
}

/**
 * Checks whether a relative path is the epic-agent base template.
 */
function isEpicAgentTemplate(relativePath: string): boolean {
  const normalized = relativePath.replace(/\\/g, "/");
  return normalized === EPIC_AGENT_TEMPLATE_PATH;
}

/**
 * Renders all template files by replacing tokens with values from the brief.
 *
 * Reads every file under the templates directory, performs token replacement,
 * and returns an array of RenderedFile objects with their relative paths
 * and rendered content.
 *
 * When workflowMode is "sprint", swarm-specific files (ai/swarm/, swarm-workflow.md)
 * are excluded. The epic-agent template is always excluded (used as a base for
 * dynamic generation in swarm.ts, not rendered directly).
 *
 * @param templatesDir - Absolute path to the templates directory
 * @param tokens - Token map for replacements
 * @param workflowMode - "sprint" or "swarm" (defaults to "sprint")
 * @returns Array of rendered files ready to be written to disk
 */
export async function renderTemplates(
  templatesDir: string,
  tokens: TokenMap,
  workflowMode: WorkflowMode = "sprint",
): Promise<RenderedFile[]> {
  const filePaths = await collectFiles(templatesDir);
  const rendered: RenderedFile[] = [];

  for (const relativePath of filePaths) {
    if (isEpicAgentTemplate(relativePath)) {
      continue;
    }

    if (workflowMode === "sprint" && isSwarmOnlyPath(relativePath)) {
      continue;
    }

    const absolutePath = join(templatesDir, relativePath);
    const content = await readFile(absolutePath, "utf-8");
    const renderedContent = replaceTokens(content, tokens);

    rendered.push({
      relativePath: applyTemplateRenames(relativePath),
      content: renderedContent,
    });
  }

  return rendered;
}
