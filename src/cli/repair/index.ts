/**
 * `meto-cli repair`: checks the meto files of a project and repairs them.
 *
 * Two kinds of repair share one plan:
 *  - version: meto's own files brought up to the current templates
 *    (what `audit --upgrade` did; that flag now runs this command)
 *  - swarm: the swarm files brought back in step with the board
 *
 * The plan is shown before anything is written. What only a person can
 * settle is reported and never written.
 */

import { readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import * as p from "@clack/prompts";
import { applyUpgradeAction, planUpgrade } from "../audit/upgrade.js";
import type { UpgradeAction } from "../audit/upgrade.js";
import { replaceTokens, resolveTemplatesDir } from "../renderer.js";
import { DOMAIN_FILE, SWARM_FILE, planSwarmRepair, readSwarmRepairInput } from "./swarm-repair.js";
import type { RepairReport } from "./swarm-repair.js";

export interface RepairOptions {
  /** Report what would change, write nothing */
  check: boolean;
  /** Apply every change without asking */
  yes: boolean;
  /** Only the swarm repairs, for the /meto-swarm workflow */
  swarmOnly: boolean;
}

export interface RepairPlan {
  actions: UpgradeAction[];
  reports: RepairReport[];
}

export interface RepairResult extends RepairPlan {
  applied: number;
}

/** Board columns a meto project cannot work without. */
const BOARD_FILES = [
  { path: "ai/tasks/tasks-backlog.md", title: "Tasks Backlog" },
  { path: "ai/tasks/tasks-todo.md", title: "Tasks Todo" },
  { path: "ai/tasks/tasks-in-progress.md", title: "Tasks In Progress" },
  { path: "ai/tasks/tasks-in-testing.md", title: "Tasks In Testing" },
  { path: "ai/tasks/tasks-done.md", title: "Tasks Done" },
];

async function readOrUndefined(path: string): Promise<string | undefined> {
  try {
    return await readFile(path, "utf-8");
  } catch {
    return undefined;
  }
}

/**
 * Works out every repair for the project. Reads only; writes nothing.
 * A project that is already healthy yields no actions and no reports.
 */
export async function planRepair(
  projectDir: string,
  options: Pick<RepairOptions, "swarmOnly">,
  templatesDir: string = resolveTemplatesDir(),
): Promise<RepairPlan> {
  const project = (path: string) => readOrUndefined(join(projectDir, path));
  const isSwarm = (await project(SWARM_FILE)) !== undefined;
  const actions: UpgradeAction[] = options.swarmOnly ? [] : await planUpgrade(projectDir, templatesDir);
  const reports: RepairReport[] = [];

  if (!options.swarmOnly) {
    for (const { path, title } of BOARD_FILES) {
      if ((await project(path)) === undefined) {
        actions.push({ path, kind: "add", description: "missing board column", content: `# ${title}\n` });
      }
    }
  }

  if (isSwarm) {
    if ((await project(DOMAIN_FILE)) === undefined) {
      const template = await readOrUndefined(join(templatesDir, DOMAIN_FILE));
      const claudeMd = await project("CLAUDE.md");
      const name = claudeMd?.match(/^# (.+)$/m)?.[1]?.trim() ?? basename(projectDir);
      if (template !== undefined) {
        actions.push({
          path: DOMAIN_FILE,
          kind: "add",
          description: "missing domain map; @meto-pm fills in the paths each epic owns",
          content: replaceTokens(template, { PROJECT_NAME: name }),
        });
      }
    }

    const epicTemplate = await readOrUndefined(join(templatesDir, ".claude", "agents", "epic-agent.md"));
    if (epicTemplate !== undefined) {
      const swarm = planSwarmRepair(await readSwarmRepairInput(projectDir, epicTemplate.replace(/\r\n/g, "\n")));
      // A swarm repair of a file wins over a version repair of it: it is rendered from the same template
      const repaired = new Set(swarm.actions.map((a) => a.path));
      const kept = actions.filter((a) => !repaired.has(a.path));
      actions.length = 0;
      actions.push(...kept, ...swarm.actions);
      reports.push(...swarm.reports);
    }
  }

  return { actions, reports };
}

const KIND_LABEL: Record<UpgradeAction["kind"], string> = {
  add: "add    ",
  replace: "replace",
  merge: "merge  ",
  clean: "clean  ",
  remove: "remove ",
};

function showReports(reports: RepairReport[]): void {
  if (reports.length === 0) {
    return;
  }
  p.note(
    reports.map((r) => `${r.path}\n  ${r.message}`).join("\n"),
    `${reports.length} thing${reports.length === 1 ? "" : "s"} for you to settle (not changed by repair)`,
  );
}

/**
 * Plans, shows and applies the repairs of one project.
 *
 * @returns the plan and how many of its actions were applied
 */
export async function repairProject(projectDir: string, options: RepairOptions): Promise<RepairResult> {
  const plan = await planRepair(projectDir, options);
  const { actions, reports } = plan;

  if (actions.length === 0) {
    p.log.success(reports.length === 0 ? "Nothing to repair." : "Nothing repair can change.");
    showReports(reports);
    return { ...plan, applied: 0 };
  }

  p.note(
    actions.map((a) => `${KIND_LABEL[a.kind]}  ${a.path}\n         ${a.description}`).join("\n"),
    `${actions.length} file${actions.length === 1 ? "" : "s"} to repair`,
  );
  showReports(reports);

  if (options.check) {
    p.log.info("Checked only: nothing was written. Run `meto-cli repair` to apply.");
    return { ...plan, applied: 0 };
  }

  if (!options.swarmOnly) {
    p.log.info(
      "The board's slices, context files, definition of done, code guidelines and a filled-in handoff are not touched. Commit first: git keeps the previous versions.",
    );
  }

  let mode: "all" | "each" = "all";
  if (!options.yes) {
    const choice = await p.select({
      message: "Apply these changes?",
      options: [
        { value: "all" as const, label: "Apply all" },
        { value: "each" as const, label: "Ask for each file" },
        { value: "none" as const, label: "Cancel" },
      ],
    });
    if (p.isCancel(choice) || choice === "none") {
      p.log.info("Nothing changed.");
      return { ...plan, applied: 0 };
    }
    mode = choice;
  }

  let applied = 0;
  for (const action of actions) {
    if (mode === "each") {
      const ok = await p.confirm({
        message: `${KIND_LABEL[action.kind].trim()} ${action.path}? (${action.description})`,
        initialValue: true,
      });
      if (p.isCancel(ok) || !ok) {
        p.log.info(`Skipped ${action.path}`);
        continue;
      }
    }
    try {
      await applyUpgradeAction(projectDir, action);
      applied++;
    } catch (err: unknown) {
      const reason = err instanceof Error ? err.message : "Unknown error";
      p.log.error(`Failed on ${action.path}: ${reason}`);
    }
  }

  p.log.success(`Repaired ${applied} of ${actions.length} file${actions.length === 1 ? "" : "s"}.`);
  return { ...plan, applied };
}

function printHelp(): void {
  p.intro("meto-cli repair");
  p.note(
    [
      "Usage: meto-cli repair [options]",
      "",
      "Checks the meto files of this project and repairs them:",
      "  - meto's own files (agents, CLAUDE.md sections, mod, workflow, skills, hooks)",
      "    are brought up to this version; your vision, stack, conventions and board are kept",
      "  - missing board columns are added",
      "  - in swarm mode: an agent for every epic, a row for it in SWARM_AWARENESS.md,",
      "    and no epic left `complete` while it has slices on the board",
      "",
      "Shows the plan first and asks before writing.",
      "",
      "Options:",
      "  --check       Write nothing; exit 1 when something needs repair",
      "  --yes         Apply every change without asking",
      "  --swarm       Only the swarm repairs (what /meto-swarm runs before each round)",
      "  --help, -h    Show this help message",
    ].join("\n"),
    "Help",
  );
  p.outro("Run 'meto-cli repair' from your project root.");
}

/** Entry point for `meto-cli repair`. */
export async function runRepair(): Promise<void> {
  const args = process.argv.slice(3);
  if (args.includes("--help") || args.includes("-h")) {
    printHelp();
    return;
  }

  const options: RepairOptions = {
    check: args.includes("--check"),
    yes: args.includes("--yes"),
    swarmOnly: args.includes("--swarm"),
  };
  const projectDir = process.cwd();

  p.intro("meto-cli repair");

  if ((await readOrUndefined(join(projectDir, "CLAUDE.md"))) === undefined) {
    p.log.error("No CLAUDE.md here. Run `meto-cli audit` first to install meto in this project.");
    p.outro("");
    process.exit(1);
  }

  const result = await repairProject(projectDir, options);
  const pending = result.actions.length - result.applied + result.reports.length;

  if (options.check) {
    const fixable = result.actions.length > 0;
    p.outro(pending === 0 ? "Healthy." : fixable ? "Needs repair." : "Nothing to repair, but the items above need you.");
    if (pending > 0) {
      process.exit(1);
    }
    return;
  }
  p.outro(result.reports.length === 0 ? "Done." : "Done. The items above still need you.");
}
