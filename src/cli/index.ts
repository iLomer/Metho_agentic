#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import * as p from "@clack/prompts";
import { collectProjectBrief } from "./prompts.js";
import {
  buildTokenMap,
  renderTemplates,
  resolveTemplatesDir,
} from "./renderer.js";
import { initGitRepo } from "./git.js";
import { DirectoryNotEmptyError, writeScaffold } from "./scaffold.js";

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
      "  init          Scaffold a new structured project",
      "",
      "Options:",
      "  --help, -h    Show this help message",
      "  --version, -v Show the installed version",
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
    p.intro("lom -- methodology-first project scaffolding");

    const brief = await collectProjectBrief();

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
    s.start("Generating project scaffold...");

    try {
      const templatesDir = resolveTemplatesDir();
      const tokens = buildTokenMap(brief);
      const renderedFiles = await renderTemplates(templatesDir, tokens);
      await writeScaffold(brief.outputDirectory, renderedFiles);

      s.stop("Scaffold generated.");

      const gitSpinner = p.spinner();
      gitSpinner.start("Initializing git repository...");

      try {
        await initGitRepo(brief.outputDirectory);
        gitSpinner.stop("Git repository initialized.");
      } catch {
        gitSpinner.stop("Git initialization skipped (git may not be installed).");
      }

      p.note(
        [
          `cd ${brief.outputDirectory}`,
          "Open in VS Code and call @lom-pm set up the project",
        ].join("\n"),
        "Next Steps",
      );

      p.outro("Done. Happy building!");
    } catch (error: unknown) {
      s.stop("Failed.");

      if (error instanceof DirectoryNotEmptyError) {
        p.log.error(error.message);
      } else if (error instanceof Error) {
        p.log.error(`Scaffold generation failed: ${error.message}`);
      } else {
        p.log.error("An unexpected error occurred during scaffold generation.");
      }

      process.exit(1);
    }

    return;
  }

  p.intro("lom -- methodology-first project scaffolding");
  p.log.error(`Unknown command: ${arg}`);
  p.log.info("Run 'lom --help' to see available commands.");
  p.outro("");
  process.exit(1);
}

main();
