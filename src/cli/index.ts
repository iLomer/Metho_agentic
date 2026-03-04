#!/usr/bin/env node

import * as p from "@clack/prompts";

function main(): void {
  const command = process.argv[2];

  p.intro("lom -- methodology-first project scaffolding");

  if (command === "init") {
    p.log.info("Ready to scaffold your project.");
    p.log.step("Prompts and file generation coming in future slices.");
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
