/**
 * Pure content transforms for `meto-cli audit --upgrade`: no filesystem, so
 * tests cover them directly.
 */

/** Sections older memory templates shipped; their text is instructions, not memory. */
const OLD_MEMORY_SECTIONS = new Set([
  "## Session Start Checklist",
  "## Red Flags — Stop Before Acting",
  "## Review Conduct",
]);

/**
 * Removes the boilerplate older scaffolds wrote into an agent's MEMORY.md:
 * the "read at session start" line, the session checklist, and the red-flag
 * and review-conduct sections. With `memory: project` the file is loaded into
 * the agent, so stale instructions there would be followed.
 *
 * Everything else, including what the agent wrote, is kept.
 */
export function cleanMemory(content: string): string {
  const eol = content.includes("\r\n") ? "\r\n" : "\n";
  const kept: string[] = [];
  let skipping: "section" | "checklist" | undefined;

  for (const line of content.replace(/\r\n/g, "\n").split("\n")) {
    const trimmed = line.trim();

    if (skipping === "section") {
      if (!line.startsWith("## ")) {
        continue;
      }
      skipping = undefined;
    }
    if (skipping === "checklist") {
      if (trimmed === "" || trimmed.startsWith("- [")) {
        continue;
      }
      skipping = undefined;
    }

    if (OLD_MEMORY_SECTIONS.has(trimmed)) {
      skipping = "section";
      continue;
    }
    if (/^\*\*Session start checklist:\*\*/.test(trimmed)) {
      skipping = "checklist";
      continue;
    }
    if (/^\*Read at session start\. Update at session end\..*\*$/.test(trimmed)) {
      continue;
    }
    kept.push(line);
  }

  const text = kept
    .join("\n")
    // Dividers left without the section they separated
    .replace(/(\n---\n)(\s*---\n)+/g, "$1")
    .replace(/^(# .+\n)\s*---\n/, "$1")
    .replace(/\n{3,}/g, "\n\n");
  return text.split("\n").join(eol);
}

/** The echo hooks older scaffolds wrote; their output reached nobody. */
const OLD_HOOK_COMMANDS = [
  "update your agent MEMORY.md before you go",
  "handoff will be preserved in ai/handoff/current.md",
  "Re-read ai/handoff/current.md to restore sprint state",
];

interface HookGroup {
  hooks?: Array<{ command?: string }>;
  [key: string]: unknown;
}

function isOldMetoHook(group: HookGroup): boolean {
  const commands = (group.hooks ?? []).map((h) => h.command ?? "");
  return (
    commands.length > 0 &&
    commands.every((command) => OLD_HOOK_COMMANDS.some((old) => command.includes(old)))
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Merges the template's env and hooks into an existing `.claude/settings.json`.
 *
 * - Keeps every key the project has, including its permissions.
 * - Drops the echo hooks and the `agents` list older scaffolds wrote: Claude
 *   Code ignores that key, and the echoes never reached the user or the model.
 * - Adds each template hook event the project does not already have.
 *
 * @returns the merged JSON, or undefined when the existing file is not valid JSON
 */
export function upgradeSettings(existing: string, template: string): string | undefined {
  let current: unknown;
  let source: unknown;
  try {
    current = JSON.parse(existing);
    source = JSON.parse(template);
  } catch {
    return undefined;
  }
  if (!isRecord(current) || !isRecord(source)) {
    return undefined;
  }

  const merged: Record<string, unknown> = { ...current };

  const agents = merged.agents;
  if (Array.isArray(agents) && agents.every((a) => isRecord(a) && "slug" in a && "file" in a)) {
    delete merged.agents;
  }

  merged.env = {
    ...(isRecord(source.env) ? source.env : {}),
    ...(isRecord(current.env) ? current.env : {}),
  };

  const hooks: Record<string, unknown> = {};
  for (const [event, groups] of Object.entries(isRecord(current.hooks) ? current.hooks : {})) {
    const keptGroups = Array.isArray(groups)
      ? groups.filter((group) => !(isRecord(group) && isOldMetoHook(group as HookGroup)))
      : groups;
    if (!Array.isArray(keptGroups) || keptGroups.length > 0) {
      hooks[event] = keptGroups;
    }
  }
  for (const [event, groups] of Object.entries(isRecord(source.hooks) ? source.hooks : {})) {
    if (!(event in hooks)) {
      hooks[event] = groups;
    }
  }
  merged.hooks = hooks;

  return JSON.stringify(merged, null, 2) + "\n";
}
