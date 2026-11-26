import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import * as p from "@clack/prompts";
import { findProjectRoot } from "./doctor.js";
import { readSwarmState } from "./swarm-state.js";
import { planRepair } from "./repair/index.js";
import { parseSwarmAwareness } from "./swarm-parser.js";
import type { SwarmState, SwarmEpic } from "./swarm-parser.js";

/**
 * Checks whether the SWARM_AWARENESS.md file exists at the given project root.
 */
export async function swarmFileExists(projectRoot: string): Promise<boolean> {
  try {
    await access(join(projectRoot, "ai", "swarm", "SWARM_AWARENESS.md"));
    return true;
  } catch {
    return false;
  }
}

/**
 * Calculates the number of days between a start date string and now.
 * Returns the string "unknown" if the date cannot be parsed.
 */
function formatDuration(started: string): string {
  const startDate = new Date(started);
  if (isNaN(startDate.getTime())) {
    return "unknown duration";
  }
  const now = new Date();
  const diffMs = now.getTime() - startDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) {
    return "started today";
  }
  if (diffDays === 1) {
    return "1 day";
  }
  return `${diffDays} days`;
}

/**
 * Renders the epic list, one line per epic with the appropriate clack log level.
 */
function displayEpics(epics: SwarmEpic[]): void {
  if (epics.length === 0) {
    p.log.warning("No epics found in swarm state.");
    return;
  }

  for (const epic of epics) {
    const line = `${epic.id} -- ${epic.name}   [${epic.status}]  ${epic.tasksDone} tasks done`;

    switch (epic.status) {
      case "complete":
        p.log.success(line);
        break;
      case "on-track":
        p.log.info(line);
        break;
      case "blocked":
        p.log.error(line);
        break;
      case "testing-ready":
        p.log.info(line);
        break;
      case "not-started":
        p.log.warning(line);
        break;
    }
  }
}

/**
 * Renders the blockers section.
 */
function displayBlockers(epics: SwarmEpic[]): void {
  const blocked = epics.filter((e) => e.status === "blocked");

  if (blocked.length === 0) {
    p.log.success("No blockers");
    return;
  }

  for (const epic of blocked) {
    p.log.error(`${epic.id} blocker: ${epic.blocker}`);
  }
}

/**
 * Renders the conflicts section (only if there are pending conflicts).
 */
function displayConflicts(state: SwarmState): void {
  const pending = state.conflicts.filter((c) => c.resolution === "pending");

  if (pending.length === 0) {
    return;
  }

  for (const conflict of pending) {
    p.log.warning(
      `Conflict: ${conflict.file} -- ${conflict.agents} [${conflict.resolution}]`,
    );
  }
}

/**
 * Formats and displays the full swarm status dashboard.
 */
export function displayDashboard(state: SwarmState): void {
  const duration = formatDuration(state.meta.started);

  p.note(
    [
      `Project: ${state.meta.projectName}`,
      `Mode: ${state.meta.mode}`,
      `Duration: ${duration}`,
    ].join("\n"),
    "Swarm Dashboard",
  );

  displayEpics(state.epics);

  p.note(
    `${state.meta.acPassed} of ${state.meta.acTotal} passed`,
    "Acceptance Criteria",
  );

  displayBlockers(state.epics);
  displayConflicts(state);
}

/**
 * Entry point for the `meto-cli status` command.
 * Detects the project root, verifies swarm mode, parses SWARM_AWARENESS.md,
 * and displays the dashboard.
 */
export async function runStatus(): Promise<void> {
  // --json: the state as one JSON object and nothing else, for the /meto-swarm workflow
  if (process.argv.slice(3).includes("--json")) {
    const root = await findProjectRoot(process.cwd());
    if (root === undefined || !(await swarmFileExists(root))) {
      process.stdout.write(JSON.stringify({ error: "not a swarm-mode meto project" }) + "\n");
      process.exit(1);
    }
    process.stdout.write(JSON.stringify(await readSwarmState(root), null, 2) + "\n");
    return;
  }

  p.intro("meto-cli status");

  const projectRoot = await findProjectRoot(process.cwd());

  if (projectRoot === undefined) {
    p.log.error(
      "No Meto project found. Run this command from within a Meto-scaffolded project.",
    );
    p.outro("");
    process.exit(1);
  }

  const hasSwarmFile = await swarmFileExists(projectRoot);

  if (!hasSwarmFile) {
    p.log.error(
      "This project is not using swarm mode. Run 'meto-cli init' with Swarm workflow to enable.",
    );
    p.outro("");
    process.exit(1);
  }

  const swarmPath = join(projectRoot, "ai", "swarm", "SWARM_AWARENESS.md");
  const content = await readFile(swarmPath, "utf-8");
  const state = parseSwarmAwareness(content);

  displayDashboard(state);

  // One line when the project's meto files are out of step; silent otherwise
  try {
    const plan = await planRepair(projectRoot, { swarmOnly: false });
    const count = plan.actions.length + plan.reports.length;
    if (count > 0) {
      p.log.warning(
        `meto-cli repair has ${count} thing${count === 1 ? "" : "s"} to fix here. Run \`npx meto-cli repair --check\` to see them.`,
      );
    }
  } catch {
    // The dashboard is what was asked for; a failed check adds nothing to it
  }

  p.outro("Status complete.");
}
