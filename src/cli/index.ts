#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import * as p from "@clack/prompts";
import { collectDeepContent, collectProjectBrief } from "./prompts.js";
import { InterruptionHandler } from "./interruption.js";
import {
  buildTokenMap,
  renderTemplates,
  resolveTemplatesDir,
} from "./renderer.js";
import { initGitRepo } from "./git.js";
import {
  checkWritePermission,
  PreflightError,
  runPreflightChecks,
} from "./preflight.js";
import { DirectoryNotEmptyError, writeScaffold } from "./scaffold.js";
import { formatFileTree } from "./tree.js";
import { runDoctor } from "./doctor.js";
import { generateWithAI, AIGenerationTimeoutError } from "./ai-generator.js";
import { parseAIOutput, validateAIContent } from "./ai-parser.js";
import type { AIGeneratedContent } from "./ai-parser.js";

/**
 * Resolves the absolute path to the package root directory.
 * At runtime: dist/cli/index.js -> package root is ../../
 */
function resolvePackageRoot(): string {
  const currentFileUrl = new URL(import.meta.url);
  const packageRoot = new URL("../../", currentFileUrl);
  return decodeURIComponent(packageRoot.pathname);
}

/**
 * Reads the version string from package.json at the package root.
 */
async function readVersion(): Promise<string> {
  const packageJsonPath = join(resolvePackageRoot(), "package.json");
  const raw = await readFile(packageJsonPath, "utf-8");
  const parsed: unknown = JSON.parse(raw);
  if (
    typeof parsed === "object" &&
    parsed !== null &&
    "version" in parsed &&
    typeof (parsed as Record<string, unknown>).version === "string"
  ) {
    return (parsed as Record<string, unknown>).version as string;
  }
  return "unknown";
}

/**
 * Prints usage information for the CLI.
 */
function printHelp(): void {
  p.intro("meto-cli -- methodology-first project scaffolding");
  p.note(
    [
      "Usage: meto-cli <command> [options]",
      "",
      "Commands:",
      "  init              Scaffold a new structured project",
      "  init --dry-run    Preview files without writing to disk",
      "  init --no-ai      Skip AI generation, use standard prompts",
      "  doctor            Check methodology health of the current project",
      "",
      "Options:",
      "  --help, -h        Show this help message",
      "  --version, -v     Show the installed version",
    ].join("\n"),
    "Help",
  );
  p.outro("Run 'meto-cli init' to get started.");
}

async function main(): Promise<void> {
  const arg = process.argv[2];

  if (arg === "--help" || arg === "-h" || arg === undefined) {
    printHelp();
    return;
  }

  if (arg === "--version" || arg === "-v") {
    const version = await readVersion();
    p.intro(`meto-cli v${version}`);
    p.outro("");
    return;
  }

  if (arg === "init") {
    const dryRun = process.argv.includes("--dry-run");
    const interruption = new InterruptionHandler();
    interruption.install();

    p.intro("meto-cli -- methodology-first project scaffolding");

    let preflight;
    try {
      preflight = await runPreflightChecks();
    } catch (error: unknown) {
      if (error instanceof PreflightError) {
        p.log.error(error.message);
      } else if (error instanceof Error) {
        p.log.error(`Pre-flight check failed: ${error.message}`);
      } else {
        p.log.error("An unexpected error occurred during pre-flight checks.");
      }
      interruption.uninstall();
      process.exit(1);
    }

    if (!preflight.gitAvailable) {
      p.log.warning(
        "git not found -- the scaffolded project will not be initialized as a git repository.",
      );
    }

    const noAIFlag = process.argv.includes("--no-ai");
    let useAI = preflight.claudeCodeAvailable && !noAIFlag;

    if (noAIFlag) {
      p.log.info("AI generation disabled via --no-ai flag");
    } else if (preflight.claudeCodeAvailable) {
      p.log.info("Claude Code detected -- AI-powered generation available");

      const confirmAI = await p.confirm({
        message: "Use AI to generate your project content?",
        initialValue: true,
      });
      if (p.isCancel(confirmAI)) {
        p.cancel("Project setup cancelled.");
        interruption.uninstall();
        process.exit(0);
      }
      useAI = confirmAI;

      if (!useAI) {
        p.log.info("Using standard prompts instead.");
      }
    } else {
      p.log.info("Claude Code not found -- using standard prompts");
    }

    const brief = await collectProjectBrief({ useAI });

    const writeError = await checkWritePermission(brief.outputDirectory);
    if (writeError !== undefined) {
      p.log.error(writeError);
      interruption.uninstall();
      process.exit(1);
    }

    const stackLabel =
      brief.techStack === "custom"
        ? brief.customStack
        : brief.techStack;

    p.note(
      [
        `Project:    ${brief.projectName}`,
        `Desc:       ${brief.description}`,
        `Users:      ${brief.targetUsers}`,
        `Stack:      ${stackLabel}`,
        `Output:     ${brief.outputDirectory}`,
      ].join("\n"),
      "Project Brief",
    );

    let aiContent: AIGeneratedContent | undefined;

    if (useAI) {
      const aiSpinner = p.spinner();
      aiSpinner.start("Generating project content with Claude Code...");

      const startTime = Date.now();
      let elapsedSeconds = 0;
      const progressTimer = setInterval(() => {
        elapsedSeconds += 10;
        aiSpinner.message(`Generating project content with Claude Code... (${elapsedSeconds}s)`);
      }, 10_000);

      try {
        const aiResult = await generateWithAI({
          projectName: brief.projectName,
          description: brief.description,
          targetUsers: brief.targetUsers,
          techStack: brief.techStack,
          customStack: brief.customStack,
        });

        clearInterval(progressTimer);
        const totalSeconds = Math.round((Date.now() - startTime) / 1000);

        aiContent = parseAIOutput(aiResult.raw);
        aiSpinner.stop(`Project content generated (${totalSeconds}s)`);

        const validation = validateAIContent(aiContent);
        if (validation.warnings.length > 0) {
          for (const warning of validation.warnings) {
            p.log.warning(warning);
          }
        }

        const epicCount = (aiContent.epics.match(/## E\d+/g) ?? []).length;
        const taskCount = (aiContent.starterTasks.match(/## \[slice-\d+\]/g) ?? []).length;
        const dodCustomized = aiContent.definitionOfDone !== "To be defined by @meto-pm";

        const visionFirstLine = aiContent.productVision.split("\n")[0].trim();
        const visionPreview =
          visionFirstLine.length > 80
            ? visionFirstLine.slice(0, 77) + "..."
            : visionFirstLine;

        const summaryLines: string[] = [
          `Vision: ${visionPreview}`,
          `Epics: ${epicCount}`,
          `Tasks: ${taskCount}`,
          `DoD: ${dodCustomized ? "Customized for stack" : "Default"}`,
        ];

        p.note(summaryLines.join("\n"), "AI Generation Summary");
      } catch (aiError: unknown) {
        clearInterval(progressTimer);

        if (aiError instanceof AIGenerationTimeoutError) {
          aiSpinner.stop("AI generation failed -- falling back to standard prompts");
          p.log.warning(`Timed out after ${Math.round(aiError.timeoutMs / 1000)} seconds. Falling back to standard prompts.`);
        } else {
          const reason =
            aiError instanceof Error ? aiError.message : "Unknown error";
          aiSpinner.stop("AI generation failed -- falling back to standard prompts");
          p.log.warning(`AI generation failed: ${reason}. Falling back to standard prompts.`);
        }

        const deep = await collectDeepContent();
        brief.problemStatement = deep.problemStatement;
        brief.successCriteria = deep.successCriteria;
        brief.valueProposition = deep.valueProposition;
        brief.outOfScope = deep.outOfScope;
        brief.codeConventions = deep.codeConventions;
      }
    }

    const s = p.spinner();
    s.start("Rendering templates...");

    try {
      const templatesDir = resolveTemplatesDir();
      const tokens = buildTokenMap(brief, aiContent);
      const renderedFiles = await renderTemplates(templatesDir, tokens);

      if (dryRun) {
        s.stop("Templates rendered (dry run).");

        const filePaths = renderedFiles.map((f) => f.relativePath);
        const tree = formatFileTree(filePaths);

        p.note(tree, "Files that would be created");
        p.log.info(`Total files: ${renderedFiles.length}`);
        p.outro("Dry run complete. No files were written.");
        interruption.uninstall();
        return;
      }

      const isCwd =
        resolve(brief.outputDirectory) === resolve(".");

      interruption.arm(brief.outputDirectory);
      const skipped = await writeScaffold(
        brief.outputDirectory,
        renderedFiles,
        { merge: isCwd },
      );
      interruption.disarm();

      if (skipped > 0) {
        s.stop(`Scaffold generated (${skipped} existing file${skipped === 1 ? "" : "s"} preserved).`);
      } else {
        s.stop("Scaffold generated.");
      }

      let gitInitSucceeded = false;
      if (preflight.gitAvailable) {
        const gitSpinner = p.spinner();
        gitSpinner.start("Initializing git repository...");

        try {
          await initGitRepo(brief.outputDirectory);
          gitSpinner.stop("Git repository initialized.");
          gitInitSucceeded = true;
        } catch {
          gitSpinner.stop("Git initialization failed -- skipping.");
        }
      }

      let nextSteps: string[];
      if (isCwd) {
        nextSteps = [
          "Your project is ready in the current directory.",
          "",
          "1. Open it in your editor",
          "   code .",
          "",
          "2. Start Claude Code",
          "   claude",
          "",
          '3. Tell Claude: "Read CLAUDE.md and set up the backlog"',
          "   This kicks off the PM agent to create your first tasks.",
          "",
          "4. Track this project on Buildrack (optional)",
          "   buildrack init",
        ];
      } else {
        nextSteps = [
          `Your project is ready at ${brief.outputDirectory}`,
          "",
          "1. Open it in your editor",
          `   code ${brief.outputDirectory}`,
          "",
          "2. Start Claude Code in the project folder",
          `   cd ${brief.outputDirectory} && claude`,
          "",
          '3. Tell Claude: "Read CLAUDE.md and set up the backlog"',
          "   This kicks off the PM agent to create your first tasks.",
          "",
          "4. Track this project on Buildrack (optional)",
          "   buildrack init",
        ];
      }

      p.note(nextSteps.join("\n"), "What's Next");

      p.outro("Done. Happy building!");
    } catch (error: unknown) {
      s.stop("Failed.");
      interruption.disarm();

      if (error instanceof DirectoryNotEmptyError) {
        p.log.error(error.message);
      } else if (error instanceof Error) {
        p.log.error(`Scaffold generation failed: ${error.message}`);
      } else {
        p.log.error("An unexpected error occurred during scaffold generation.");
      }

      interruption.uninstall();
      process.exit(1);
    }

    interruption.uninstall();
    return;
  }

  if (arg === "doctor") {
    await runDoctor();
    return;
  }

  p.intro("meto-cli -- methodology-first project scaffolding");
  p.log.error(`Unknown command: ${arg}`);
  p.log.info("Run 'meto-cli --help' to see available commands.");
  p.outro("");
  process.exit(1);
}

main();
