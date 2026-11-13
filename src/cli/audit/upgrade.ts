/**
 * `meto-cli audit --upgrade`: brings the meto-owned files of an existing
 * project up to the current templates.
 *
 * The normal audit never overwrites a file, so a project scaffolded by an
 * older meto-cli keeps its old agent definitions and CLAUDE.md. The upgrade
 * replaces what meto owns and keeps what the project owns: the vision, stack
 * and conventions in CLAUDE.md, the board, the context files, the handoff,
 * and whatever the agents wrote into their memory files.
 */

import { readdir, readFile, rm, writeFile, mkdir } from "node:fs/promises";
import { basename, dirname, join, relative } from "node:path";
import * as p from "@clack/prompts";
import {
  buildWorkflowAgentsSection,
  buildWorkflowDailyWorkflow,
  buildWorkflowSessionStart,
  replaceTokens,
  resolveTemplatesDir,
} from "../renderer.js";
import type { WorkflowMode } from "../types.js";
import { METO_MOD_DIR } from "./mod-install.js";
import { cleanMemory, upgradeSettings } from "./upgrade-content.js";

/** One change the upgrade would make. `content` undefined means: delete the file. */
export interface UpgradeAction {
  /** Project-relative path, forward slashes */
  path: string;
  kind: "replace" | "merge" | "clean" | "remove";
  /** Why, shown to the user */
  description: string;
  content: string | undefined;
}

/** Agent definitions with no project content: replaced by the current template. */
const AGENT_FILES = [
  ".claude/agents/pm-agent.md",
  ".claude/agents/developer-agent.md",
  ".claude/agents/tester-agent.md",
  ".claude/agents/community-manager-agent.md",
];

/** Other meto documents with no project content. */
const STATIC_FILES = [
  "ai/workflows/commit-conventions.md",
  "ai/workflows/swarm-workflow.md",
  "ai/rubric/README.md",
  "ai/rubric/tester-rubric.md",
];

/** Documents older scaffolds shipped that the current methodology no longer uses. */
const OBSOLETE_FILES = [
  "ai/workflows/session-checkpoint.md",
  "ai/handoff/README.md",
];

const EPIC_TEMPLATE = ".claude/agents/epic-agent.md";
const SETTINGS_FILE = ".claude/settings.json";
const HANDOFF_FILE = "ai/handoff/current.md";

async function readOrUndefined(path: string): Promise<string | undefined> {
  try {
    return await readFile(path, "utf-8");
  } catch {
    return undefined;
  }
}

async function listFiles(dir: string): Promise<string[]> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const files: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFiles(full)));
    } else if (entry.isFile()) {
      files.push(full);
    }
  }
  return files;
}

/** Compares content ignoring line endings and trailing whitespace at the end. */
function sameText(a: string, b: string): boolean {
  const norm = (s: string) => s.replace(/\r\n/g, "\n").trimEnd();
  return norm(a) === norm(b);
}

/**
 * The text between the `start` heading line and the first of the `end`
 * heading lines (or the end of the file). The stack section holds `## `
 * headings of its own, so sections are cut at known headings, not at any.
 */
function between(md: string, start: string, end: string[]): string | undefined {
  const lines = md.split("\n");
  const from = lines.findIndex((line) => line.trim() === start);
  if (from === -1) {
    return undefined;
  }
  const rest = lines.slice(from + 1);
  const to = rest.findIndex((line) => end.includes(line.trim()));
  return (to === -1 ? rest : rest.slice(0, to)).join("\n").trim();
}

/**
 * Re-renders CLAUDE.md from the current template, keeping the project's own
 * content: its name, vision, stack and code conventions.
 *
 * @returns the new content, or undefined when the file is not a meto CLAUDE.md
 */
export function upgradeClaudeMd(
  existing: string,
  template: string,
  workflowMode: WorkflowMode,
): string | undefined {
  const text = existing.replace(/\r\n/g, "\n");
  const title = text.match(/^# (.+)$/m)?.[1]?.trim();
  const stack = between(text, "## Stack", ["## Code Conventions"]);
  const conventions = between(text, "## Code Conventions", ["## Code Guidelines"]);
  if (title === undefined || stack === undefined || conventions === undefined) {
    return undefined;
  }

  // The vision is everything between the title and the first section or divider.
  const afterTitle = text.slice(text.indexOf(`# ${title}`) + title.length + 2);
  const visionEnd = afterTitle.search(/^(## |---\s*$)/m);
  const vision = (visionEnd === -1 ? afterTitle : afterTitle.slice(0, visionEnd)).trim();

  return replaceTokens(template.replace(/\r\n/g, "\n"), {
    PROJECT_NAME: title,
    PRODUCT_VISION: vision,
    TECH_STACK: stack,
    CODE_CONVENTIONS: conventions.replace(/^<!--.*-->\n?/, "").trim(),
    WORKFLOW_SESSION_START: buildWorkflowSessionStart(workflowMode),
    WORKFLOW_AGENTS_SECTION: buildWorkflowAgentsSection(workflowMode),
    WORKFLOW_DAILY_WORKFLOW: buildWorkflowDailyWorkflow(workflowMode),
  });
}

/**
 * Re-renders an epic agent from the current template, keeping its epic id,
 * name and domain.
 *
 * @returns the new content, or undefined when those can't be read from the file
 */
export function upgradeEpicAgent(existing: string, template: string): string | undefined {
  const id = existing.match(/^name:\s*meto-epic-(\S+)\s*$/m)?.[1];
  const name = existing.match(/^# Epic Agent — (.+) \([^)]+\)\s*$/m)?.[1]
    ?? existing.match(/^You implement the slices of (.+) \([^)]+\), and only those\.\s*$/m)?.[1];
  const domain = existing.match(/\*\*My files:\*\*\s*`([^`]+)`/)?.[1]
    ?? existing.match(/^- Your domain: `([^`]+)`/m)?.[1];
  if (id === undefined || name === undefined || domain === undefined) {
    return undefined;
  }
  return replaceTokens(template.replace(/\r\n/g, "\n"), {
    EPIC_ID: id,
    EPIC_NAME: name,
    EPIC_DOMAIN: domain,
  });
}

/**
 * Works out what an upgrade would change. Reads only; writes nothing.
 * Files that already match the current templates produce no action.
 */
export async function planUpgrade(
  projectDir: string,
  templatesDir: string = resolveTemplatesDir(),
): Promise<UpgradeAction[]> {
  const actions: UpgradeAction[] = [];
  const project = (path: string) => readOrUndefined(join(projectDir, path));
  const template = (path: string) => readOrUndefined(join(templatesDir, path));

  const claudeMd = await project("CLAUDE.md");
  const projectName = claudeMd?.match(/^# (.+)$/m)?.[1]?.trim() ?? basename(projectDir);
  const tokens = { PROJECT_NAME: projectName };
  const isSwarm = (await project("ai/swarm/SWARM_AWARENESS.md")) !== undefined;

  const replaceWith = (path: string, current: string, next: string, description: string): void => {
    if (!sameText(current, next)) {
      actions.push({ path, kind: "replace", description, content: next });
    }
  };

  // CLAUDE.md: meto's sections are replaced, the project's content is kept
  const claudeTemplate = await template("CLAUDE.md");
  if (claudeMd !== undefined && claudeTemplate !== undefined) {
    const next = upgradeClaudeMd(claudeMd, claudeTemplate, isSwarm ? "swarm" : "sprint");
    if (next !== undefined) {
      replaceWith(
        "CLAUDE.md",
        claudeMd,
        next,
        "current methodology sections; your vision, stack and code conventions are kept, other edits are not",
      );
    }
  }

  // Agent definitions and static documents
  for (const path of [...AGENT_FILES, ...STATIC_FILES]) {
    const current = await project(path);
    const source = await template(path);
    if (current !== undefined && source !== undefined) {
      replaceWith(path, current, replaceTokens(source, tokens), "current template");
    }
  }

  // Epic agents: one file per epic, rendered from the epic template
  const epicTemplate = await template(EPIC_TEMPLATE);
  const agentFiles = await listFiles(join(projectDir, ".claude", "agents"));
  for (const file of agentFiles) {
    if (epicTemplate === undefined || !/^epic-agent-.+\.md$/.test(basename(file))) {
      continue;
    }
    const current = await readFile(file, "utf-8");
    const next = upgradeEpicAgent(current, epicTemplate);
    if (next !== undefined) {
      const path = relative(projectDir, file).replace(/\\/g, "/");
      replaceWith(path, current, next, "current template; epic id, name and domain are kept");
    }
  }

  // The mod: every file, including ones a newer version added
  for (const file of await listFiles(join(templatesDir, METO_MOD_DIR))) {
    const path = relative(templatesDir, file).replace(/\\/g, "/");
    const source = await readFile(file, "utf-8");
    const current = await project(path);
    if (current === undefined || !sameText(current, source)) {
      actions.push({ path, kind: "replace", description: "current meto mod", content: source });
    }
  }

  // Settings: hooks and env are merged in, everything else is kept
  const settings = await project(SETTINGS_FILE);
  const settingsTemplate = await template(SETTINGS_FILE);
  if (settings !== undefined && settingsTemplate !== undefined) {
    const next = upgradeSettings(settings, settingsTemplate);
    if (next !== undefined && !sameText(settings, next)) {
      actions.push({
        path: SETTINGS_FILE,
        kind: "merge",
        description: "adds the session-start and compaction hooks; your permissions and other settings are kept",
        content: next,
      });
    }
  }

  // Agent memory: only the boilerplate older scaffolds wrote is removed
  for (const file of await listFiles(join(projectDir, ".claude", "agent-memory"))) {
    if (basename(file) !== "MEMORY.md") {
      continue;
    }
    const current = await readFile(file, "utf-8");
    const next = cleanMemory(current);
    if (!sameText(current, next)) {
      actions.push({
        path: relative(projectDir, file).replace(/\\/g, "/"),
        kind: "clean",
        description: "removes the old session checklist and red-flag boilerplate; what the agent wrote is kept",
        content: next,
      });
    }
  }

  // A handoff that was never filled in would be loaded into every session as is
  const handoff = await project(HANDOFF_FILE);
  const handoffTemplate = await template(HANDOFF_FILE);
  if (handoff !== undefined && handoffTemplate !== undefined && handoff.includes("{{AGENT_NAME}}")) {
    replaceWith(HANDOFF_FILE, handoff, handoffTemplate, "unfilled handoff template replaced by the short one");
  }

  for (const path of OBSOLETE_FILES) {
    if ((await project(path)) !== undefined) {
      actions.push({ path, kind: "remove", description: "no longer used", content: undefined });
    }
  }

  return actions;
}

/** Applies one planned action. */
export async function applyUpgradeAction(projectDir: string, action: UpgradeAction): Promise<void> {
  const target = join(projectDir, action.path);
  if (action.content === undefined) {
    await rm(target, { force: true });
    return;
  }
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, action.content, "utf-8");
}

const KIND_LABEL: Record<UpgradeAction["kind"], string> = {
  replace: "replace",
  merge: "merge  ",
  clean: "clean  ",
  remove: "remove ",
};

/**
 * Interactive entry point for `meto-cli audit --upgrade`.
 *
 * @param assumeYes - apply every change without asking (`--yes`)
 * @returns the number of changes applied
 */
export async function runUpgrade(projectDir: string, assumeYes: boolean): Promise<number> {
  if ((await readOrUndefined(join(projectDir, "CLAUDE.md"))) === undefined) {
    p.log.error("No CLAUDE.md here. Run `meto-cli audit` first to install meto in this project.");
    return 0;
  }

  const actions = await planUpgrade(projectDir);
  if (actions.length === 0) {
    p.log.success("Already up to date with this version of meto-cli.");
    return 0;
  }

  p.note(
    actions.map((a) => `${KIND_LABEL[a.kind]}  ${a.path}\n         ${a.description}`).join("\n"),
    `${actions.length} file${actions.length === 1 ? "" : "s"} to upgrade`,
  );
  p.log.info(
    "The board, context files, definition of done, code guidelines and a filled-in handoff are not touched. Commit first: git keeps the previous versions.",
  );

  let mode: "all" | "each" = "all";
  if (!assumeYes) {
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
      return 0;
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

  p.log.success(`Upgraded ${applied} of ${actions.length} file${actions.length === 1 ? "" : "s"}.`);
  return applied;
}
