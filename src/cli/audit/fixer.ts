import { appendFile, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import * as p from "@clack/prompts";
import {
  buildWorkflowAgentsSection,
  replaceTokens,
  resolveTemplatesDir,
} from "../renderer.js";
import type { TokenMap } from "../renderer.js";
import type { WorkflowMode } from "../types.js";
import type { ScanResult, LayerScanResult } from "./scanner.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Outcome of a single fix attempt. */
export type FixOutcome = "created" | "declined" | "skipped" | "error";

/**
 * Result of attempting to fix a single failed expectation.
 */
export interface FixResult {
  /** The scan result that triggered this fix */
  scanResult: ScanResult;
  /** What happened during the fix attempt */
  outcome: FixOutcome;
  /** Human-readable message about the fix */
  message: string;
}

/**
 * Result of running the fixer on an entire layer.
 */
export interface LayerFixResult {
  /** Layer ID that was fixed */
  layerId: number;
  /** Individual fix results */
  fixes: FixResult[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Checks whether a file exists at the given path.
 * Used to prevent overwriting existing files.
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Reads a template file from the templates directory and applies token substitution.
 * Returns undefined if the template does not exist.
 */
async function readAndRenderTemplate(
  templateRelativePath: string,
  tokens: TokenMap,
): Promise<string | undefined> {
  const templatesDir = resolveTemplatesDir();
  const templatePath = join(templatesDir, templateRelativePath);

  try {
    const raw = await readFile(templatePath, "utf-8");
    return replaceTokens(raw, tokens);
  } catch {
    return undefined;
  }
}

/**
 * Writes content to a file, creating parent directories as needed.
 * Never overwrites existing files.
 */
async function writeFileIfMissing(
  filePath: string,
  content: string,
): Promise<boolean> {
  if (await fileExists(filePath)) {
    return false;
  }

  const dir = dirname(filePath);
  await mkdir(dir, { recursive: true });
  await writeFile(filePath, content, "utf-8");
  return true;
}

// ---------------------------------------------------------------------------
// Fixer
// ---------------------------------------------------------------------------

/**
 * Determines the template path for a given blueprint expectation path.
 * Most paths map directly (e.g. "CLAUDE.md" -> "CLAUDE.md" in templates/).
 * Directories don't have a template -- they are created implicitly.
 */
function getTemplatePath(expectationPath: string, checkType: string): string | undefined {
  // Directories are created implicitly when files inside them are created.
  // For standalone dir-exists checks, we create the directory directly.
  if (checkType === "dir-exists") {
    return undefined;
  }

  // Custom checks (like README glob, alternative dirs) are not fixable via templates
  if (checkType === "custom") {
    return undefined;
  }

  // Direct path mapping for file-exists and file-contains
  return expectationPath;
}

/**
 * Attempts to fix a single failed expectation by creating the missing file or directory.
 * Prompts the user for confirmation before each creation.
 *
 * This function is layer-agnostic -- it works with any failed ScanResult.
 */
async function fixSingleExpectation(
  projectDir: string,
  scanResult: ScanResult,
  tokens: TokenMap,
): Promise<FixResult> {
  const { expectation } = scanResult;

  // Not fixable according to blueprint
  if (!expectation.fixable) {
    return {
      scanResult,
      outcome: "skipped",
      message: `${expectation.description} is not auto-fixable`,
    };
  }

  const targetPath = join(projectDir, expectation.path);

  // Already exists -- should not happen for failed checks, but be safe
  if (await fileExists(targetPath)) {
    return {
      scanResult,
      outcome: "skipped",
      message: `${expectation.path} already exists`,
    };
  }

  // Prompt user
  const shouldFix = await p.confirm({
    message: `Create ${expectation.path}? (${expectation.description})`,
    initialValue: true,
  });

  if (p.isCancel(shouldFix) || !shouldFix) {
    return {
      scanResult,
      outcome: "declined",
      message: `Skipped ${expectation.path}`,
    };
  }

  // Handle directory creation
  if (expectation.checkType === "dir-exists") {
    try {
      await mkdir(targetPath, { recursive: true });
      return {
        scanResult,
        outcome: "created",
        message: `Created directory ${expectation.path}/`,
      };
    } catch (err: unknown) {
      const reason = err instanceof Error ? err.message : "Unknown error";
      return {
        scanResult,
        outcome: "error",
        message: `Failed to create ${expectation.path}/: ${reason}`,
      };
    }
  }

  // Handle file creation from template
  const templatePath = getTemplatePath(expectation.path, expectation.checkType);
  if (templatePath === undefined) {
    return {
      scanResult,
      outcome: "skipped",
      message: `No template available for ${expectation.path}`,
    };
  }

  const rendered = await readAndRenderTemplate(templatePath, tokens);
  if (rendered === undefined) {
    return {
      scanResult,
      outcome: "error",
      message: `Template not found for ${expectation.path}`,
    };
  }

  try {
    const written = await writeFileIfMissing(targetPath, rendered);
    if (written) {
      return {
        scanResult,
        outcome: "created",
        message: `Created ${expectation.path}`,
      };
    }
    return {
      scanResult,
      outcome: "skipped",
      message: `${expectation.path} already exists (race condition)`,
    };
  } catch (err: unknown) {
    const reason = err instanceof Error ? err.message : "Unknown error";
    return {
      scanResult,
      outcome: "error",
      message: `Failed to create ${expectation.path}: ${reason}`,
    };
  }
}

/**
 * Runs the interactive fixer for all failed expectations in a layer scan result.
 * Prompts the user for each missing file/directory and creates it from templates.
 *
 * This function is layer-agnostic -- it works with any LayerScanResult.
 * The fixer never overwrites existing files -- only creates missing ones.
 *
 * @param projectDir - Absolute path to the project root
 * @param layerResult - The scan result containing failures to fix
 * @param tokens - Token map for template rendering
 * @returns Fix results for each failed expectation
 */
export async function fixLayer(
  projectDir: string,
  layerResult: LayerScanResult,
  tokens: TokenMap,
): Promise<LayerFixResult> {
  const failedResults = layerResult.results.filter((r) => r.status === "fail");
  const fixes: FixResult[] = [];

  if (failedResults.length === 0) {
    return {
      layerId: layerResult.layer.id,
      fixes,
    };
  }

  p.log.info(
    `Layer ${layerResult.layer.id} (${layerResult.layer.name}): ${failedResults.length} issue${failedResults.length === 1 ? "" : "s"} found`,
  );

  for (const failed of failedResults) {
    const fixResult = await fixSingleExpectation(projectDir, failed, tokens);
    fixes.push(fixResult);

    // Display result
    switch (fixResult.outcome) {
      case "created":
        p.log.success(fixResult.message);
        break;
      case "declined":
        p.log.info(fixResult.message);
        break;
      case "skipped":
        p.log.warning(fixResult.message);
        break;
      case "error":
        p.log.error(fixResult.message);
        break;
    }
  }

  return {
    layerId: layerResult.layer.id,
    fixes,
  };
}

// ---------------------------------------------------------------------------
// Layer 2 (Agents) -- workflow-aware fixer
// ---------------------------------------------------------------------------

/** Expectation IDs that represent agent definition files (not dirs or memory). */
const AGENT_FILE_IDS = new Set([
  "L2-pm-agent",
  "L2-developer-agent",
  "L2-tester-agent",
]);

/** Expectation IDs that represent agent memory MEMORY.md files inside dirs. */
const AGENT_MEMORY_DIR_IDS = new Set([
  "L2-pm-memory",
  "L2-developer-memory",
  "L2-tester-memory",
]);

/** Maps memory directory expectation IDs to the MEMORY.md template path. */
const MEMORY_TEMPLATE_PATHS: Record<string, string> = {
  "L2-pm-memory": ".claude/agent-memory/meto-pm/MEMORY.md",
  "L2-developer-memory": ".claude/agent-memory/meto-developer/MEMORY.md",
  "L2-tester-memory": ".claude/agent-memory/meto-tester/MEMORY.md",
};

/**
 * Checks whether any failed expectations in the layer involve agent files
 * that would require a workflow choice (Sprint vs Swarm).
 */
function hasAgentFileFailures(layerResult: LayerScanResult): boolean {
  return layerResult.results.some(
    (r) => r.status === "fail" && AGENT_FILE_IDS.has(r.expectation.id),
  );
}

/**
 * Prompts the user to choose between Sprint and Swarm workflow modes.
 * Returns the chosen mode, or undefined if the user cancels.
 */
async function promptWorkflowChoice(): Promise<WorkflowMode | undefined> {
  const choice = await p.select({
    message: "Which workflow mode should the agents use?",
    options: [
      {
        value: "sprint" as const,
        label: "Sprint",
        hint: "3 agents (PM, Developer, Tester) with human orchestration",
      },
      {
        value: "swarm" as const,
        label: "Swarm",
        hint: "Parallel epic agents with autonomous orchestration",
      },
    ],
  });

  if (p.isCancel(choice)) {
    return undefined;
  }

  return choice;
}

/**
 * Runs the interactive fixer for Layer 2 (Agents).
 *
 * Layer 2 differs from other layers because:
 * - When creating agent files from scratch, the user is asked to choose
 *   Sprint vs Swarm workflow mode.
 * - The workflow choice affects the WORKFLOW_AGENTS_SECTION token in CLAUDE.md
 *   (CLAUDE.md is Layer 1, but the token content depends on the Layer 2 choice).
 * - Agent memory directories are created with a MEMORY.md file from templates.
 *
 * The fixer never overwrites existing agent definitions or settings.
 *
 * @param projectDir - Absolute path to the project root
 * @param layerResult - The Layer 2 scan result containing failures to fix
 * @param tokens - Token map for template rendering
 * @returns Fix results for each failed expectation
 */
export async function fixLayerTwo(
  projectDir: string,
  layerResult: LayerScanResult,
  tokens: TokenMap,
): Promise<LayerFixResult> {
  const failedResults = layerResult.results.filter((r) => r.status === "fail");
  const fixes: FixResult[] = [];

  if (failedResults.length === 0) {
    return {
      layerId: layerResult.layer.id,
      fixes,
    };
  }

  p.log.info(
    `Layer ${layerResult.layer.id} (${layerResult.layer.name}): ${failedResults.length} issue${failedResults.length === 1 ? "" : "s"} found`,
  );

  // If any agent files need creating, ask for workflow choice up front
  let workflowMode: WorkflowMode = "sprint";
  if (hasAgentFileFailures(layerResult)) {
    const choice = await promptWorkflowChoice();
    if (choice === undefined) {
      // User cancelled -- decline all fixes
      for (const failed of failedResults) {
        fixes.push({
          scanResult: failed,
          outcome: "declined",
          message: `Skipped ${failed.expectation.path} (cancelled workflow choice)`,
        });
      }
      return { layerId: layerResult.layer.id, fixes };
    }
    workflowMode = choice;
  }

  // Update the token map with the chosen workflow section
  const updatedTokens: TokenMap = {
    ...tokens,
    WORKFLOW_AGENTS_SECTION: buildWorkflowAgentsSection(workflowMode),
  };

  for (const failed of failedResults) {
    const { expectation } = failed;

    // Not fixable according to blueprint
    if (!expectation.fixable) {
      const result: FixResult = {
        scanResult: failed,
        outcome: "skipped",
        message: `${expectation.description} is not auto-fixable`,
      };
      fixes.push(result);
      p.log.warning(result.message);
      continue;
    }

    const targetPath = join(projectDir, expectation.path);

    // Already exists -- safety check
    if (await fileExists(targetPath)) {
      const result: FixResult = {
        scanResult: failed,
        outcome: "skipped",
        message: `${expectation.path} already exists`,
      };
      fixes.push(result);
      p.log.warning(result.message);
      continue;
    }

    // Prompt user for each item
    const shouldFix = await p.confirm({
      message: `Create ${expectation.path}? (${expectation.description})`,
      initialValue: true,
    });

    if (p.isCancel(shouldFix) || !shouldFix) {
      const result: FixResult = {
        scanResult: failed,
        outcome: "declined",
        message: `Skipped ${expectation.path}`,
      };
      fixes.push(result);
      p.log.info(result.message);
      continue;
    }

    // Handle directory creation (with MEMORY.md for agent memory dirs)
    if (expectation.checkType === "dir-exists") {
      try {
        await mkdir(targetPath, { recursive: true });

        // For agent memory directories, also create the MEMORY.md file
        const memoryTemplatePath = MEMORY_TEMPLATE_PATHS[expectation.id];
        if (memoryTemplatePath !== undefined) {
          const rendered = await readAndRenderTemplate(
            memoryTemplatePath,
            updatedTokens,
          );
          if (rendered !== undefined) {
            const memoryFilePath = join(targetPath, "MEMORY.md");
            await writeFileIfMissing(memoryFilePath, rendered);
          }
        }

        const result: FixResult = {
          scanResult: failed,
          outcome: "created",
          message: `Created directory ${expectation.path}/`,
        };
        fixes.push(result);
        p.log.success(result.message);
      } catch (err: unknown) {
        const reason = err instanceof Error ? err.message : "Unknown error";
        const result: FixResult = {
          scanResult: failed,
          outcome: "error",
          message: `Failed to create ${expectation.path}/: ${reason}`,
        };
        fixes.push(result);
        p.log.error(result.message);
      }
      continue;
    }

    // Handle file creation from template
    const templatePath = getTemplatePath(
      expectation.path,
      expectation.checkType,
    );
    if (templatePath === undefined) {
      const result: FixResult = {
        scanResult: failed,
        outcome: "skipped",
        message: `No template available for ${expectation.path}`,
      };
      fixes.push(result);
      p.log.warning(result.message);
      continue;
    }

    const rendered = await readAndRenderTemplate(templatePath, updatedTokens);
    if (rendered === undefined) {
      const result: FixResult = {
        scanResult: failed,
        outcome: "error",
        message: `Template not found for ${expectation.path}`,
      };
      fixes.push(result);
      p.log.error(result.message);
      continue;
    }

    try {
      const written = await writeFileIfMissing(targetPath, rendered);
      if (written) {
        const result: FixResult = {
          scanResult: failed,
          outcome: "created",
          message: `Created ${expectation.path}`,
        };
        fixes.push(result);
        p.log.success(result.message);
      } else {
        const result: FixResult = {
          scanResult: failed,
          outcome: "skipped",
          message: `${expectation.path} already exists (race condition)`,
        };
        fixes.push(result);
        p.log.warning(result.message);
      }
    } catch (err: unknown) {
      const reason = err instanceof Error ? err.message : "Unknown error";
      const result: FixResult = {
        scanResult: failed,
        outcome: "error",
        message: `Failed to create ${expectation.path}: ${reason}`,
      };
      fixes.push(result);
      p.log.error(result.message);
    }
  }

  return {
    layerId: layerResult.layer.id,
    fixes,
  };
}

// ---------------------------------------------------------------------------
// Layer 3 (Governance) -- content-aware fixer
// ---------------------------------------------------------------------------

/**
 * Expectation IDs for governance file-exists checks (create from templates).
 */
const GOVERNANCE_FILE_IDS = new Set([
  "L3-dod-exists",
  "L3-session-checkpoint",
  "L3-code-guidelines-exists",
]);

/**
 * Expectation IDs for agent file-contains checks (append references).
 */
const AGENT_REFERENCE_IDS = new Set([
  "L3-pm-agent-refs-dod",
  "L3-developer-agent-refs-commit",
  "L3-tester-agent-refs-dod",
  "L3-pm-agent-refs-memory",
  "L3-developer-agent-refs-memory",
  "L3-tester-agent-refs-memory",
  "L3-developer-agent-refs-guidelines",
  "L3-tester-agent-refs-guidelines",
]);

/**
 * Maps agent reference expectation IDs to the text that should be appended
 * to the agent definition file when the reference is missing.
 * Each snippet is a self-contained section that can be appended at the end.
 */
const AGENT_REFERENCE_PATCHES: Record<string, string> = {
  "L3-pm-agent-refs-dod": [
    "",
    "## Governance References",
    "- Read `/ai/workflows/definition-of-done.md` before closing any task",
    "",
  ].join("\n"),
  "L3-developer-agent-refs-commit": [
    "",
    "## Commit Conventions",
    "- Follow commit conventions in `/ai/workflows/commit-conventions.md`",
    "- Format: `<type>(<scope>): <description> [<agent-tag>]`",
    "",
  ].join("\n"),
  "L3-tester-agent-refs-dod": [
    "",
    "## Governance References",
    "- Validate against `/ai/workflows/definition-of-done.md` for every task",
    "",
  ].join("\n"),
  "L3-pm-agent-refs-memory": [
    "",
    "## Memory",
    "- Read `.claude/agent-memory/meto-pm/MEMORY.md` at session start",
    "- Update `.claude/agent-memory/meto-pm/MEMORY.md` at session end",
    "",
  ].join("\n"),
  "L3-developer-agent-refs-memory": [
    "",
    "## Memory",
    "- Read `.claude/agent-memory/meto-developer/MEMORY.md` at session start",
    "- Update `.claude/agent-memory/meto-developer/MEMORY.md` at session end",
    "",
  ].join("\n"),
  "L3-tester-agent-refs-memory": [
    "",
    "## Memory",
    "- Read `.claude/agent-memory/meto-tester/MEMORY.md` at session start",
    "- Update `.claude/agent-memory/meto-tester/MEMORY.md` at session end",
    "",
  ].join("\n"),
  "L3-developer-agent-refs-guidelines": [
    "",
    "## Code Guidelines",
    "- Read `/ai/workflows/code-guidelines.md` at session start",
    "- Enforce file size limits (300 lines max), function length (50 lines max)",
    "- No file should exceed 500 lines -- hard stop",
    "",
  ].join("\n"),
  "L3-tester-agent-refs-guidelines": [
    "",
    "## Code Guidelines",
    "- Read `/ai/workflows/code-guidelines.md` during validation",
    "- Check changed files with `wc -l` -- no file over 300 lines",
    "- Verify no function exceeds 50 lines",
    "",
  ].join("\n"),
};

/**
 * The commit conventions section appended to CLAUDE.md when the
 * L3-commit-conventions-defined check fails.
 */
const COMMIT_CONVENTIONS_PATCH = [
  "",
  "## Commit Format",
  "",
  "```",
  "feat(scope): description [dev-agent]",
  "fix(scope): description [dev-agent]",
  "docs(scope): description [pm-agent]",
  "test(scope): description [tester-agent]",
  "chore(scope): description [bootstrap]",
  "```",
  "",
].join("\n");

/**
 * Appends content to the end of an existing file.
 * Returns false if the file does not exist.
 */
async function appendToFile(
  filePath: string,
  content: string,
): Promise<boolean> {
  try {
    await stat(filePath);
    await appendFile(filePath, content, "utf-8");
    return true;
  } catch {
    return false;
  }
}

/**
 * Runs the interactive fixer for Layer 3 (Governance).
 *
 * Layer 3 differs from other layers because it has three fix strategies:
 * 1. Missing governance files (definition-of-done, session-checkpoint):
 *    created from templates, same as Layer 1.
 * 2. CLAUDE.md missing commit conventions section:
 *    appends a commit format section to the existing file.
 * 3. Agent definitions missing governance references:
 *    appends reference sections to existing agent files.
 *
 * All fixes are additive -- existing content is never modified or removed.
 *
 * @param projectDir - Absolute path to the project root
 * @param layerResult - The Layer 3 scan result containing failures to fix
 * @param tokens - Token map for template rendering
 * @returns Fix results for each failed expectation
 */
export async function fixLayerThree(
  projectDir: string,
  layerResult: LayerScanResult,
  tokens: TokenMap,
): Promise<LayerFixResult> {
  const failedResults = layerResult.results.filter((r) => r.status === "fail");
  const fixes: FixResult[] = [];

  if (failedResults.length === 0) {
    return {
      layerId: layerResult.layer.id,
      fixes,
    };
  }

  p.log.info(
    `Layer ${layerResult.layer.id} (${layerResult.layer.name}): ${failedResults.length} issue${failedResults.length === 1 ? "" : "s"} found`,
  );

  for (const failed of failedResults) {
    const { expectation } = failed;

    // Not fixable according to blueprint
    if (!expectation.fixable) {
      const result: FixResult = {
        scanResult: failed,
        outcome: "skipped",
        message: `${expectation.description} is not auto-fixable`,
      };
      fixes.push(result);
      p.log.warning(result.message);
      continue;
    }

    const targetPath = join(projectDir, expectation.path);

    // Strategy 1: Missing governance files -- create from templates
    if (GOVERNANCE_FILE_IDS.has(expectation.id)) {
      if (await fileExists(targetPath)) {
        const result: FixResult = {
          scanResult: failed,
          outcome: "skipped",
          message: `${expectation.path} already exists`,
        };
        fixes.push(result);
        p.log.warning(result.message);
        continue;
      }

      const shouldFix = await p.confirm({
        message: `Create ${expectation.path}? (${expectation.description})`,
        initialValue: true,
      });

      if (p.isCancel(shouldFix) || !shouldFix) {
        const result: FixResult = {
          scanResult: failed,
          outcome: "declined",
          message: `Skipped ${expectation.path}`,
        };
        fixes.push(result);
        p.log.info(result.message);
        continue;
      }

      const rendered = await readAndRenderTemplate(expectation.path, tokens);
      if (rendered === undefined) {
        const result: FixResult = {
          scanResult: failed,
          outcome: "error",
          message: `Template not found for ${expectation.path}`,
        };
        fixes.push(result);
        p.log.error(result.message);
        continue;
      }

      try {
        const written = await writeFileIfMissing(targetPath, rendered);
        if (written) {
          const result: FixResult = {
            scanResult: failed,
            outcome: "created",
            message: `Created ${expectation.path}`,
          };
          fixes.push(result);
          p.log.success(result.message);
        } else {
          const result: FixResult = {
            scanResult: failed,
            outcome: "skipped",
            message: `${expectation.path} already exists (race condition)`,
          };
          fixes.push(result);
          p.log.warning(result.message);
        }
      } catch (err: unknown) {
        const reason = err instanceof Error ? err.message : "Unknown error";
        const result: FixResult = {
          scanResult: failed,
          outcome: "error",
          message: `Failed to create ${expectation.path}: ${reason}`,
        };
        fixes.push(result);
        p.log.error(result.message);
      }
      continue;
    }

    // Strategy 2: CLAUDE.md missing commit conventions -- append section
    if (expectation.id === "L3-commit-conventions-defined") {
      if (!(await fileExists(targetPath))) {
        const result: FixResult = {
          scanResult: failed,
          outcome: "skipped",
          message: `${expectation.path} does not exist -- create it first via Layer 1`,
        };
        fixes.push(result);
        p.log.warning(result.message);
        continue;
      }

      const shouldFix = await p.confirm({
        message: `Append commit conventions section to ${expectation.path}?`,
        initialValue: true,
      });

      if (p.isCancel(shouldFix) || !shouldFix) {
        const result: FixResult = {
          scanResult: failed,
          outcome: "declined",
          message: `Skipped adding commit conventions to ${expectation.path}`,
        };
        fixes.push(result);
        p.log.info(result.message);
        continue;
      }

      try {
        const appended = await appendToFile(targetPath, COMMIT_CONVENTIONS_PATCH);
        if (appended) {
          const result: FixResult = {
            scanResult: failed,
            outcome: "created",
            message: `Appended commit conventions section to ${expectation.path}`,
          };
          fixes.push(result);
          p.log.success(result.message);
        } else {
          const result: FixResult = {
            scanResult: failed,
            outcome: "error",
            message: `Could not append to ${expectation.path}`,
          };
          fixes.push(result);
          p.log.error(result.message);
        }
      } catch (err: unknown) {
        const reason = err instanceof Error ? err.message : "Unknown error";
        const result: FixResult = {
          scanResult: failed,
          outcome: "error",
          message: `Failed to append to ${expectation.path}: ${reason}`,
        };
        fixes.push(result);
        p.log.error(result.message);
      }
      continue;
    }

    // Strategy 3: Agent definitions missing governance references -- append
    if (AGENT_REFERENCE_IDS.has(expectation.id)) {
      if (!(await fileExists(targetPath))) {
        const result: FixResult = {
          scanResult: failed,
          outcome: "skipped",
          message: `${expectation.path} does not exist -- create it first via Layer 2`,
        };
        fixes.push(result);
        p.log.warning(result.message);
        continue;
      }

      const patch = AGENT_REFERENCE_PATCHES[expectation.id];
      if (patch === undefined) {
        const result: FixResult = {
          scanResult: failed,
          outcome: "skipped",
          message: `No patch defined for ${expectation.id}`,
        };
        fixes.push(result);
        p.log.warning(result.message);
        continue;
      }

      const shouldFix = await p.confirm({
        message: `Append ${expectation.description.toLowerCase()} to ${expectation.path}?`,
        initialValue: true,
      });

      if (p.isCancel(shouldFix) || !shouldFix) {
        const result: FixResult = {
          scanResult: failed,
          outcome: "declined",
          message: `Skipped patching ${expectation.path}`,
        };
        fixes.push(result);
        p.log.info(result.message);
        continue;
      }

      try {
        const appended = await appendToFile(targetPath, patch);
        if (appended) {
          const result: FixResult = {
            scanResult: failed,
            outcome: "created",
            message: `Appended ${expectation.description.toLowerCase()} to ${expectation.path}`,
          };
          fixes.push(result);
          p.log.success(result.message);
        } else {
          const result: FixResult = {
            scanResult: failed,
            outcome: "error",
            message: `Could not append to ${expectation.path}`,
          };
          fixes.push(result);
          p.log.error(result.message);
        }
      } catch (err: unknown) {
        const reason = err instanceof Error ? err.message : "Unknown error";
        const result: FixResult = {
          scanResult: failed,
          outcome: "error",
          message: `Failed to patch ${expectation.path}: ${reason}`,
        };
        fixes.push(result);
        p.log.error(result.message);
      }
      continue;
    }

    // Fallback: unknown expectation type for Layer 3
    const result: FixResult = {
      scanResult: failed,
      outcome: "skipped",
      message: `No fix strategy for ${expectation.id}`,
    };
    fixes.push(result);
    p.log.warning(result.message);
  }

  return {
    layerId: layerResult.layer.id,
    fixes,
  };
}
