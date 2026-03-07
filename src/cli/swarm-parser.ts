/**
 * Parsed swarm metadata from the [swarm:meta] section.
 */
export interface SwarmMeta {
  projectName: string;
  mode: string;
  started: string;
  totalEpics: number;
  totalTasks: number;
  acPassed: number;
  acTotal: number;
}

/**
 * A single epic row from the [swarm:epics] table.
 */
export interface SwarmEpic {
  id: string;
  name: string;
  agent: string;
  status: "not-started" | "on-track" | "blocked" | "complete";
  tasksDone: number;
  blocker: string;
}

/**
 * A single checkpoint entry from the [swarm:checkpoints] section.
 */
export interface SwarmCheckpoint {
  date: string;
  epicId: string;
  done: number;
  status: string;
  blocker: string;
}

/**
 * A single conflict entry from the [swarm:conflicts] section.
 */
export interface SwarmConflict {
  date: string;
  file: string;
  agents: string;
  resolution: "pending" | "resolved";
}

/**
 * Full parsed state from SWARM_AWARENESS.md.
 */
export interface SwarmState {
  meta: SwarmMeta;
  epics: SwarmEpic[];
  checkpoints: SwarmCheckpoint[];
  conflicts: SwarmConflict[];
}

/**
 * Valid epic status values.
 */
const VALID_EPIC_STATUSES = new Set([
  "not-started",
  "on-track",
  "blocked",
  "complete",
]);

/**
 * Valid conflict resolution values.
 */
const VALID_RESOLUTIONS = new Set(["pending", "resolved"]);

/**
 * Extracts content between a section header marker and the next section or end of file.
 * Section markers are markdown headings like `## [swarm:meta]`.
 */
function extractSection(content: string, sectionName: string): string {
  const marker = `## [swarm:${sectionName}]`;
  const startIndex = content.indexOf(marker);
  if (startIndex === -1) {
    return "";
  }

  const contentStart = startIndex + marker.length;

  // Find the next ## [swarm: section or end of content
  const nextSectionPattern = /\n## \[swarm:/;
  const remaining = content.slice(contentStart);
  const nextMatch = nextSectionPattern.exec(remaining);

  if (nextMatch !== null) {
    return remaining.slice(0, nextMatch.index).trim();
  }

  return remaining.trim();
}

/**
 * Parses the [swarm:meta] section as key-value pairs.
 * Lines matching `- **Key:** value` are extracted.
 */
function parseMeta(section: string): SwarmMeta {
  const defaults: SwarmMeta = {
    projectName: "",
    mode: "",
    started: "",
    totalEpics: 0,
    totalTasks: 0,
    acPassed: 0,
    acTotal: 0,
  };

  if (section.length === 0) {
    return defaults;
  }

  const kvPattern = /^- \*\*(.+?):\*\*\s*(.*)$/;
  const lines = section.split("\n");

  for (const line of lines) {
    const match = kvPattern.exec(line.trim());
    if (match === null) {
      continue;
    }

    const key = match[1].toLowerCase();
    const value = match[2].trim();

    switch (key) {
      case "project":
        defaults.projectName = value;
        break;
      case "mode":
        defaults.mode = value;
        break;
      case "started":
        defaults.started = value;
        break;
      case "total epics":
        defaults.totalEpics = parseInt(value, 10) || 0;
        break;
      case "total tasks":
        defaults.totalTasks = parseInt(value, 10) || 0;
        break;
      case "acceptance criteria": {
        // Format: "N / M passed"
        const acMatch = /(\d+)\s*\/\s*(\d+)\s*passed/.exec(value);
        if (acMatch !== null) {
          defaults.acPassed = parseInt(acMatch[1], 10) || 0;
          defaults.acTotal = parseInt(acMatch[2], 10) || 0;
        }
        break;
      }
    }
  }

  return defaults;
}

/**
 * Parses the [swarm:epics] section as a markdown table.
 * Skips the header row and separator row.
 */
function parseEpics(section: string): SwarmEpic[] {
  if (section.length === 0) {
    return [];
  }

  const lines = section.split("\n").filter((line) => line.trim().startsWith("|"));

  // Need at least header + separator + 1 data row
  if (lines.length < 3) {
    return [];
  }

  // Skip header (index 0) and separator (index 1)
  const dataRows = lines.slice(2);
  const epics: SwarmEpic[] = [];

  for (const row of dataRows) {
    const cells = row
      .split("|")
      .map((cell) => cell.trim())
      .filter((cell) => cell.length > 0);

    // Expect 6 columns: Epic ID, Name, Agent, Status, Tasks Done, Blocker
    if (cells.length < 6) {
      continue;
    }

    const statusRaw = cells[3].toLowerCase();
    const status = VALID_EPIC_STATUSES.has(statusRaw)
      ? (statusRaw as SwarmEpic["status"])
      : "not-started";

    const tasksDone = parseInt(cells[4], 10) || 0;

    epics.push({
      id: cells[0],
      name: cells[1],
      agent: cells[2],
      status,
      tasksDone,
      blocker: cells[5],
    });
  }

  return epics;
}

/**
 * Parses the [swarm:checkpoints] section.
 * Entries are pipe-delimited lines inside a code block.
 */
function parseCheckpoints(section: string): SwarmCheckpoint[] {
  if (section.length === 0) {
    return [];
  }

  // Extract content inside code blocks
  const codeBlockMatch = /```\n?([\s\S]*?)```/.exec(section);
  if (codeBlockMatch === null) {
    return [];
  }

  const blockContent = codeBlockMatch[1].trim();
  if (blockContent.length === 0) {
    return [];
  }

  const lines = blockContent.split("\n");
  const checkpoints: SwarmCheckpoint[] = [];

  for (const line of lines) {
    const parts = line.split("|").map((p) => p.trim());

    // Expect: date | EPIC_ID | done:N | status:X | blocker:X
    if (parts.length < 5) {
      continue;
    }

    // Skip template/example lines
    if (parts[0].startsWith("[")) {
      continue;
    }

    const doneMatch = /done:(\d+)/.exec(parts[2]);
    const statusMatch = /status:(.+)/.exec(parts[3]);
    const blockerMatch = /blocker:(.+)/.exec(parts[4]);

    checkpoints.push({
      date: parts[0],
      epicId: parts[1],
      done: doneMatch !== null ? parseInt(doneMatch[1], 10) || 0 : 0,
      status: statusMatch !== null ? statusMatch[1].trim() : "",
      blocker: blockerMatch !== null ? blockerMatch[1].trim() : "none",
    });
  }

  return checkpoints;
}

/**
 * Parses the [swarm:conflicts] section.
 * Entries are pipe-delimited lines inside a code block.
 */
function parseConflicts(section: string): SwarmConflict[] {
  if (section.length === 0) {
    return [];
  }

  const codeBlockMatch = /```\n?([\s\S]*?)```/.exec(section);
  if (codeBlockMatch === null) {
    return [];
  }

  const blockContent = codeBlockMatch[1].trim();
  if (blockContent.length === 0) {
    return [];
  }

  const lines = blockContent.split("\n");
  const conflicts: SwarmConflict[] = [];

  for (const line of lines) {
    const parts = line.split("|").map((p) => p.trim());

    // Expect: date | CONFLICT | file:path | agents:X vs Y | resolution:X
    if (parts.length < 5) {
      continue;
    }

    // Skip template/example lines
    if (parts[0].startsWith("[")) {
      continue;
    }

    const fileMatch = /file:(.+)/.exec(parts[2]);
    const agentsMatch = /agents:(.+)/.exec(parts[3]);
    const resolutionMatch = /resolution:(.+)/.exec(parts[4]);

    const resolutionRaw = resolutionMatch !== null
      ? resolutionMatch[1].trim().toLowerCase()
      : "pending";

    const resolution = VALID_RESOLUTIONS.has(resolutionRaw)
      ? (resolutionRaw as SwarmConflict["resolution"])
      : "pending";

    conflicts.push({
      date: parts[0],
      file: fileMatch !== null ? fileMatch[1].trim() : "",
      agents: agentsMatch !== null ? agentsMatch[1].trim() : "",
      resolution,
    });
  }

  return conflicts;
}

/**
 * Parses the full SWARM_AWARENESS.md content into a typed SwarmState.
 *
 * Uses section header markers (`[swarm:meta]`, `[swarm:epics]`, etc.) to locate
 * each section. Missing or empty sections return sensible defaults (empty arrays,
 * zero counts) rather than throwing.
 */
export function parseSwarmAwareness(content: string): SwarmState {
  const metaSection = extractSection(content, "meta");
  const epicsSection = extractSection(content, "epics");
  const checkpointsSection = extractSection(content, "checkpoints");
  const conflictsSection = extractSection(content, "conflicts");

  return {
    meta: parseMeta(metaSection),
    epics: parseEpics(epicsSection),
    checkpoints: parseCheckpoints(checkpointsSection),
    conflicts: parseConflicts(conflictsSection),
  };
}
