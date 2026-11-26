/**
 * Swarm repair: brings the swarm files back in step with the board.
 *
 * `init` wires the swarm up once, from the starter epics. After that the PM
 * adds epics and slices, and nothing creates the agent of a new epic, adds
 * its row to the swarm table, or reopens an epic that was already complete.
 * This module works out those repairs from the files alone; it writes nothing.
 */

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { UpgradeAction } from "../audit/upgrade.js";
import {
  UNASSIGNED_DOMAIN,
  epicAgentPath,
  epicMemoryContent,
  epicMemoryPath,
  parseEpics,
  renderEpicAgent,
} from "../swarm.js";
import type { ParsedEpic } from "../swarm.js";
import { parseBoardSlices, parseDomainOwns } from "../swarm-state.js";
import type { BoardSlice } from "../swarm-state.js";
import { parseSwarmAwareness } from "../swarm-parser.js";
import type { SwarmEpic } from "../swarm-parser.js";

export const SWARM_FILE = "ai/swarm/SWARM_AWARENESS.md";
export const DOMAIN_FILE = "ai/swarm/domain-map.md";
export const EPICS_FILE = "ai/backlog/epics.md";

/** The five board columns, as markdown. */
export interface BoardFiles {
  backlog: string;
  todo: string;
  inProgress: string;
  inTesting: string;
  done: string;
}

/** Everything the planner reads. */
export interface SwarmRepairInput {
  /** ai/backlog/epics.md */
  epics: string;
  /** ai/swarm/SWARM_AWARENESS.md */
  swarm: string;
  /** ai/swarm/domain-map.md */
  domainMap: string;
  board: BoardFiles;
  /** Existing epic agent files: epic id → content */
  agents: Record<string, string>;
  /** Epic ids that have a memory file */
  memories: string[];
  /** The epic-agent.md template */
  epicTemplate: string;
}

/** A problem only a person can settle. Never written by the repair. */
export interface RepairReport {
  path: string;
  message: string;
}

export interface SwarmRepairPlan {
  actions: UpgradeAction[];
  reports: RepairReport[];
}

const COLUMNS: { key: keyof BoardFiles; label: string }[] = [
  { key: "backlog", label: "backlog" },
  { key: "todo", label: "todo" },
  { key: "inProgress", label: "in-progress" },
  { key: "inTesting", label: "in-testing" },
  { key: "done", label: "done" },
];

const sameText = (a: string, b: string): boolean =>
  a.replace(/\r\n/g, "\n").trimEnd() === b.replace(/\r\n/g, "\n").trimEnd();

/** The domain an agent file declares, from the current or the older template. */
function declaredDomain(agent: string): string | undefined {
  return agent.match(/^- Your domain: `([^`]+)`/m)?.[1] ?? agent.match(/\*\*My files:\*\*\s*`([^`]+)`/)?.[1];
}

/** Rewrites the `[swarm:epics]` table: new statuses for listed epics, new rows appended. */
function rewriteEpicsTable(
  swarm: string,
  statuses: Map<string, SwarmEpic["status"]>,
  added: string[],
): string | undefined {
  const eol = swarm.includes("\r\n") ? "\r\n" : "\n";
  const lines = swarm.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === "## [swarm:epics]");
  if (start === -1) {
    return undefined;
  }
  const next = lines.findIndex((line, i) => i > start && /^## /.test(line));
  const end = next === -1 ? lines.length : next;

  const isRow = (line: string) => line.trim().startsWith("|");
  const first = lines.findIndex((line, i) => i > start && i < end && isRow(line));
  if (first === -1) {
    return undefined;
  }
  let last = first;
  while (last + 1 < end && isRow(lines[last + 1] ?? "")) {
    last++;
  }

  const rows: string[] = [];
  for (const line of lines.slice(first, last + 1)) {
    const cells = line.trim().replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim());
    const id = cells[0] ?? "";
    // The placeholder row goes once the table has real rows
    if (id.startsWith("*(") && added.length > 0) {
      continue;
    }
    const status = statuses.get(id);
    if (status !== undefined && cells.length >= 6) {
      cells[3] = status;
      rows.push(`| ${cells.join(" | ")} |`);
    } else {
      rows.push(line);
    }
  }

  return [...lines.slice(0, first), ...rows, ...added, ...lines.slice(last + 1)].join(eol);
}

/** Works out what to repair. Pure: reads its input, writes nothing. */
export function planSwarmRepair(input: SwarmRepairInput): SwarmRepairPlan {
  const actions: UpgradeAction[] = [];
  const reports: RepairReport[] = [];

  const epics = parseEpics(input.epics);
  const slices = COLUMNS.map(({ key, label }) => ({ label, slices: parseBoardSlices(input.board[key]) }));
  const column = (label: string): BoardSlice[] => slices.find((c) => c.label === label)?.slices ?? [];
  const count = (label: string, epicId: string): number => column(label).filter((s) => s.epic === epicId).length;

  // A slice ID in two columns means a block was copied instead of moved
  const seen = new Map<string, string[]>();
  for (const { label, slices: list } of slices) {
    for (const s of list) {
      seen.set(s.id, [...(seen.get(s.id) ?? []), label]);
    }
  }
  for (const [id, labels] of seen) {
    if (labels.length > 1) {
      reports.push({
        path: "ai/tasks/",
        message: `${id} is in more than one column (${labels.join(", ")}). Keep the block in one.`,
      });
    }
  }

  if (epics.length === 0) {
    reports.push({
      path: EPICS_FILE,
      message: "No epic found. Epics are headings like `## E1 -- Name`; the swarm is built from them.",
    });
    return { actions, reports };
  }

  const known = new Set(epics.map((e) => e.id));
  for (const { label, slices: list } of slices) {
    if (label === "done") {
      continue;
    }
    for (const s of list) {
      if (s.epic !== undefined && !known.has(s.epic)) {
        reports.push({
          path: EPICS_FILE,
          message: `${s.id} (${label}) is tagged ${s.epic}, which is not an epic in ${EPICS_FILE}. Add the epic or retag the slice.`,
        });
      }
    }
  }

  const owns = parseDomainOwns(input.domainMap);
  const domainOf = (epic: ParsedEpic): string | undefined => {
    const paths = owns[epic.id] ?? [];
    return paths.length > 0 ? paths.join(", ") : undefined;
  };
  const open = (epicId: string): number =>
    count("todo", epicId) + count("in-progress", epicId) + count("in-testing", epicId);

  // Agent and memory files
  for (const epic of epics) {
    const domain = domainOf(epic);
    const agent = input.agents[epic.id];
    if (agent === undefined) {
      actions.push({
        path: epicAgentPath(epic.id),
        kind: "add",
        description: `agent for ${epic.id} (${epic.name}), which has none`,
        content: renderEpicAgent(input.epicTemplate, epic, domain ?? UNASSIGNED_DOMAIN),
      });
    } else if (domain !== undefined && declaredDomain(agent) !== domain) {
      const next = renderEpicAgent(input.epicTemplate, epic, domain);
      if (!sameText(agent, next)) {
        actions.push({
          path: epicAgentPath(epic.id),
          kind: "replace",
          description: `domain taken from ${DOMAIN_FILE}: ${domain}`,
          content: next,
        });
      }
    }
    if (!input.memories.includes(epic.id)) {
      actions.push({
        path: epicMemoryPath(epic.id),
        kind: "add",
        description: `memory file for @meto-epic-${epic.id}`,
        content: epicMemoryContent(epic),
      });
    }
    if (domain === undefined && open(epic.id) > 0) {
      reports.push({
        path: DOMAIN_FILE,
        message: `${epic.id} (${epic.name}) has slices to build and no row under "Epic Domains". Without the paths it owns, /meto-swarm holds it. Ask @meto-pm to add them.`,
      });
    }
  }

  // The swarm table: a row per epic, and no epic left complete with work on the board
  const table = parseSwarmAwareness(input.swarm).epics;
  const listed = new Set(table.map((e) => e.id));
  const statuses = new Map<string, SwarmEpic["status"]>();
  for (const row of table) {
    if (row.status !== "complete" || !known.has(row.id)) {
      continue;
    }
    if (count("todo", row.id) + count("in-progress", row.id) > 0) {
      statuses.set(row.id, "on-track");
    } else if (count("in-testing", row.id) > 0) {
      statuses.set(row.id, "testing-ready");
    }
  }
  const missing = epics.filter((e) => !listed.has(e.id));
  const added = missing.map((epic) => {
    const done = count("done", epic.id);
    const status = open(epic.id) === 0 && done > 0 ? "complete" : "not-started";
    return `| ${epic.id} | ${epic.name} | meto-epic-${epic.id} | ${status} | ${done} | none |`;
  });

  if (statuses.size > 0 || added.length > 0) {
    const next = rewriteEpicsTable(input.swarm, statuses, added);
    if (next === undefined) {
      reports.push({
        path: SWARM_FILE,
        message: "The `## [swarm:epics]` table is missing, so epics cannot be added to it. Restore it from the template.",
      });
    } else {
      const parts = [
        missing.length > 0 ? `adds ${missing.map((e) => e.id).join(", ")} to the epic table` : "",
        statuses.size > 0
          ? `reopens ${[...statuses].map(([id, status]) => `${id} (${status})`).join(", ")}: marked complete with slices still on the board`
          : "",
      ].filter((part) => part !== "");
      actions.push({ path: SWARM_FILE, kind: "merge", description: parts.join("; "), content: next });
    }
  }

  return { actions, reports };
}

async function readOrEmpty(path: string): Promise<string> {
  try {
    return await readFile(path, "utf-8");
  } catch {
    return "";
  }
}

/** Reads the project files the planner needs. */
export async function readSwarmRepairInput(projectDir: string, epicTemplate: string): Promise<SwarmRepairInput> {
  const read = (...parts: string[]) => readOrEmpty(join(projectDir, ...parts));

  const agents: Record<string, string> = {};
  let names: string[] = [];
  try {
    names = await readdir(join(projectDir, ".claude", "agents"));
  } catch {
    names = [];
  }
  for (const name of names) {
    const id = name.match(/^epic-agent-(.+)\.md$/)?.[1];
    if (id !== undefined) {
      agents[id] = await read(".claude", "agents", name);
    }
  }

  const memories: string[] = [];
  let memoryDirs: string[] = [];
  try {
    memoryDirs = await readdir(join(projectDir, ".claude", "agent-memory"));
  } catch {
    memoryDirs = [];
  }
  for (const dir of memoryDirs) {
    const id = dir.match(/^meto-epic-(.+)$/)?.[1];
    if (id !== undefined && (await read(".claude", "agent-memory", dir, "MEMORY.md")) !== "") {
      memories.push(id);
    }
  }

  return {
    epics: await read("ai", "backlog", "epics.md"),
    swarm: await read("ai", "swarm", "SWARM_AWARENESS.md"),
    domainMap: await read("ai", "swarm", "domain-map.md"),
    board: {
      backlog: await read("ai", "tasks", "tasks-backlog.md"),
      todo: await read("ai", "tasks", "tasks-todo.md"),
      inProgress: await read("ai", "tasks", "tasks-in-progress.md"),
      inTesting: await read("ai", "tasks", "tasks-in-testing.md"),
      done: await read("ai", "tasks", "tasks-done.md"),
    },
    agents,
    memories,
    epicTemplate,
  };
}
