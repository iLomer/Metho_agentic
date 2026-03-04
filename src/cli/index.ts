#!/usr/bin/env node

import * as p from "@clack/prompts";
import { collectProjectBrief } from "./prompts.js";

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
      "Project Brief"
    );

    p.log.step("File generation coming in a future slice.");
    p.outro("Done.");
  } else {
    p.log.warning(
      command
        ? `Unknown command: ${command}`
        : "No command provided."
    );
    p.log.info("Usage: lom init");
    p.outro("Run 'lom init' to get started.");
  }
}

main();
