#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import * as p from "@clack/prompts";
import { collectProjectBrief } from "./prompts.js";
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
  p.intro("lom -- methodology-first project scaffolding");
  p.note(
    [
      "Usage: lom <command> [options]",
      "",
      "Commands:",
      "  init              Scaffold a new structured project",
      "  init --dry-run    Preview files without writing to disk",
      "",
      "Options:",
      "  --help, -h        Show this help message",
      "  --version, -v     Show the installed version",
    ].join("\n"),
    "Help",
  );
  p.outro("Run 'lom init' to get started.");
}

async function main(): Promise<void> {
  const arg = process.argv[2];

  if (arg === "--help" || arg === "-h" || arg === undefined) {
    printHelp();
    return;
  }

  if (arg === "--version" || arg === "-v") {
    const version = await readVersion();
    p.intro(`lom v${version}`);
    p.outro("");
    return;
  }

  if (arg === "init") {
    const dryRun = process.argv.includes("--dry-run");
    const interruption = new InterruptionHandler();
    interruption.install();

    p.intro("lom -- methodology-first project scaffolding");

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

    const brief = await collectProjectBrief();

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

    const s = p.spinner();
    s.start("Rendering templates...");

    try {
      const templatesDir = resolveTemplatesDir();
      const tokens = buildTokenMap(brief);
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

      interruption.arm(brief.outputDirectory);
      await writeScaffold(brief.outputDirectory, renderedFiles);
      interruption.disarm();

      s.stop("Scaffold generated.");

      if (preflight.gitAvailable) {
        const gitSpinner = p.spinner();
        gitSpinner.start("Initializing git repository...");

        try {
          await initGitRepo(brief.outputDirectory);
          gitSpinner.stop("Git repository initialized.");
        } catch {
          gitSpinner.stop("Git initialization failed -- skipping.");
        }
      }

      const nextSteps: string[] = [
        `cd ${brief.outputDirectory}`,
        "Open in your editor",
      ];

      if (!preflight.gitAvailable) {
        nextSteps.push("Run `git init` when git is available");
      }

      nextSteps.push(
        "Install Claude Code if you haven't: https://docs.anthropic.com/en/docs/claude-code",
        "Start a Claude Code session and call @lom-pm to populate your backlog",
      );

      p.note(nextSteps.join("\n"), "Next Steps");

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

  p.intro("lom -- methodology-first project scaffolding");
  p.log.error(`Unknown command: ${arg}`);
  p.log.info("Run 'lom --help' to see available commands.");
  p.outro("");
  process.exit(1);
}

main();
