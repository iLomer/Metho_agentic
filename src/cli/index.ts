#!/usr/bin/env node

import * as p from "@clack/prompts";
import { collectProjectBrief } from "./prompts.js";
import {
  buildTokenMap,
  renderTemplates,
  resolveTemplatesDir,
} from "./renderer.js";
import { DirectoryNotEmptyError, writeScaffold } from "./scaffold.js";

async function main(): Promise<void> {
  const command = process.argv[2];

  p.intro("lom -- methodology-first project scaffolding");

  if (command === "init") {
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
  } else {
    p.log.warning(
      command
        ? `Unknown command: ${command}`
        : "No command provided.",
    );
    p.log.info("Usage: lom init");
    p.outro("Run 'lom init' to get started.");
  }
}

main();
