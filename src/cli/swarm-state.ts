/**
 * Machine-readable swarm state for `meto-cli status --json`.
 *
 * The `/meto-swarm` workflow has no filesystem access, so one agent runs this
 * command and hands the JSON to the script, which then decides in plain code
 * which epic agents may run together. Parsing lives here, not in a prompt.
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { parseSwarmAwareness } from "./swarm-parser.js";

/** A task block on the board, reduced to what orchestration needs. */
export interface BoardSlice {
  id: string;
  epic: string | undefined;
  model: string | undefined;
  needs: string[];
}

/** One epic as the workflow sees it. */
export interface SwarmEpicState {
  id: string;
  name: string;
  status: string;
  /** Paths the epic owns, from ai/swarm/domain-map.md */
  owns: string[];
  /** Slices tagged with this epic in each column */
  todo: number;
  inProgress: number;
  inTesting: number;
  /** Slices this epic's todo slices need that are still in progress or testing */
  waitingOn: string[];
  /** The most capable model its todo slices ask for, or "none" */
  model: string;
}

export interface SwarmStateJson {
  project: string;
  epics: SwarmEpicState[];
}

const MODEL_RANK = ["haiku", "sonnet", "opus", "fable"];
const SLICE_REF = /\b(?:[A-Za-z]+_)?[Ss]lice-\d+[a-z]?\b/g;

/** Reads `## [slice-NNN] -- Title` blocks with their Epic, Model and Needs lines. */
export function parseBoardSlices(md: string): BoardSlice[] {
  const slices: BoardSlice[] = [];
  let current: BoardSlice | undefined;

  for (const line of md.split(/\r?\n/)) {
    const head = line.match(/^##\s+\[([^\]]+)\]/);
    if (head?.[1] !== undefined) {
      current = { id: head[1], epic: undefined, model: undefined, needs: [] };
      slices.push(current);
      continue;
    }
    if (current === undefined) {
      continue;
    }
    const epic = line.match(/\*\*Epic:\*\*\s*([A-Za-z0-9_-]+)/);
    if (epic?.[1] !== undefined) {
      current.epic = epic[1];
    }
    const model = line.match(/\*\*Model:\*\*\s*(haiku|sonnet|opus|fable)\b/i);
    if (model?.[1] !== undefined) {
      current.model = model[1].toLowerCase();
    }
    const needs = line.match(/\*\*Needs:\*\*\s*(.*)$/);
    if (needs?.[1] !== undefined) {
      current.needs = needs[1].match(SLICE_REF) ?? [];
    }
  }

  return slices;
}

/**
 * Reads the Epic Domains table of domain-map.md: epic id → the paths it owns.
 * A cell lists paths in backticks, or comma-separated; placeholders are empty.
 */
export function parseDomainOwns(md: string): Record<string, string[]> {
  const owns: Record<string, string[]> = {};
  const start = md.indexOf("## Epic Domains");
  if (start === -1) {
    return owns;
  }
  const rest = md.slice(start + "## Epic Domains".length);
  const end = rest.search(/\n## /);
  const section = end === -1 ? rest : rest.slice(0, end);

  for (const line of section.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|") || /^\|\s*-/.test(trimmed)) {
      continue;
    }
    const cells = trimmed.replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
    const id = cells[0] ?? "";
    const cell = cells[2] ?? "";
    if (id === "" || /^Epic ID$/i.test(id) || cell.startsWith("*(") || /^none\b/i.test(cell)) {
      continue;
    }
    const ticked = [...cell.matchAll(/`([^`]+)`/g)].map((m) => m[1] ?? "");
    const paths = (ticked.length > 0 ? ticked : cell.split(","))
      .map((path) => path.trim())
      .filter((path) => path !== "");
    owns[id] = paths;
  }

  return owns;
}

function strongestModel(slices: BoardSlice[]): string {
  const ranks = slices
    .map((s) => MODEL_RANK.indexOf(s.model ?? ""))
    .filter((rank) => rank !== -1);
  return ranks.length === 0 ? "none" : (MODEL_RANK[Math.max(...ranks)] ?? "none");
}

/** Combines the swarm table, the domain map and the board into one state object. */
export function buildSwarmState(files: {
  swarm: string;
  domainMap: string;
  todo: string;
  inProgress: string;
  inTesting: string;
}): SwarmStateJson {
  const swarm = parseSwarmAwareness(files.swarm);
  const owns = parseDomainOwns(files.domainMap);
  const todo = parseBoardSlices(files.todo);
  const inProgress = parseBoardSlices(files.inProgress);
  const inTesting = parseBoardSlices(files.inTesting);
  const openIds = new Set([...inProgress, ...inTesting].map((s) => s.id));

  return {
    project: swarm.meta.projectName,
    epics: swarm.epics.map((epic) => {
      const mine = todo.filter((s) => s.epic === epic.id);
      return {
        id: epic.id,
        name: epic.name,
        status: epic.status,
        owns: owns[epic.id] ?? [],
        todo: mine.length,
        inProgress: inProgress.filter((s) => s.epic === epic.id).length,
        inTesting: inTesting.filter((s) => s.epic === epic.id).length,
        waitingOn: [...new Set(mine.flatMap((s) => s.needs).filter((id) => openIds.has(id)))],
        model: strongestModel(mine),
      };
    }),
  };
}

async function readOrEmpty(path: string): Promise<string> {
  try {
    return await readFile(path, "utf-8");
  } catch {
    return "";
  }
}

/** Reads the project's swarm and board files and builds the state. */
export async function readSwarmState(projectRoot: string): Promise<SwarmStateJson> {
  const ai = (...parts: string[]) => readOrEmpty(join(projectRoot, "ai", ...parts));
  return buildSwarmState({
    swarm: await ai("swarm", "SWARM_AWARENESS.md"),
    domainMap: await ai("swarm", "domain-map.md"),
    todo: await ai("tasks", "tasks-todo.md"),
    inProgress: await ai("tasks", "tasks-in-progress.md"),
    inTesting: await ai("tasks", "tasks-in-testing.md"),
  });
}
