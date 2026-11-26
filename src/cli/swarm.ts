import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { replaceTokens } from "./renderer.js";
import type { RenderedFile } from "./renderer.js";

/**
 * Parsed epic extracted from epics markdown content.
 */
export interface ParsedEpic {
  /** Epic ID, e.g. "E1" */
  id: string;
  /** Epic name, e.g. "Project Setup" */
  name: string;
}

/**
 * Parses epic IDs and names from markdown-formatted epics content.
 * Expects headings in the format: `## E1 -- Epic Name`; a dash or a colon
 * as the separator is read too, since hand-written epics often use one.
 *
 * @param epicsContent - Markdown string containing epic definitions
 * @returns Array of parsed epics with id and name
 */
export function parseEpics(epicsContent: string): ParsedEpic[] {
  const epicPattern = /^##\s+(E\d+)\s*(?:--|[—–:-])\s*(.+)$/gm;
  const epics: ParsedEpic[] = [];
  let match: RegExpExecArray | null;

  while ((match = epicPattern.exec(epicsContent)) !== null) {
    epics.push({
      id: match[1],
      name: match[2].trim(),
    });
  }

  return epics;
}

/** What an epic agent's domain line says until `@meto-pm` fills in the domain map. */
export const UNASSIGNED_DOMAIN = "to be assigned by @meto-pm";

export const epicAgentPath = (id: string): string => `.claude/agents/epic-agent-${id}.md`;
export const epicMemoryPath = (id: string): string => `.claude/agent-memory/meto-epic-${id}/MEMORY.md`;

/** One epic's agent definition, rendered from the epic-agent template. */
export function renderEpicAgent(templateContent: string, epic: ParsedEpic, domain: string): string {
  return replaceTokens(templateContent, {
    EPIC_ID: epic.id,
    EPIC_NAME: epic.name,
    EPIC_DOMAIN: domain,
  });
}

/** The starting memory file of an epic agent. */
export function epicMemoryContent(epic: ParsedEpic): string {
  return [
    `# Epic Agent Memory -- ${epic.name} (${epic.id})`,
    "",
    `Claude Code loads this file into @meto-epic-${epic.id}. Only the first 200 lines load, so keep it short.`,
    "",
    "## Codebase Map",
    "",
    "## Watch Out",
    "",
  ].join("\n");
}

/**
 * Generates rendered epic-agent files from the epic-agent template.
 * One `.claude/agents/epic-agent-E[N].md` file is created per epic,
 * with {{EPIC_ID}}, {{EPIC_NAME}}, and {{EPIC_DOMAIN}} tokens replaced.
 *
 * Also generates a corresponding memory file per epic:
 * `.claude/agent-memory/meto-epic-E[N]/MEMORY.md`
 *
 * @param epicsContent - Markdown string containing epic definitions
 * @param templateContent - Raw content of the epic-agent.md template
 * @returns Array of rendered files (agent definitions + memory files)
 */
export function generateEpicAgents(
  epicsContent: string,
  templateContent: string,
): RenderedFile[] {
  const epics = parseEpics(epicsContent);
  const rendered: RenderedFile[] = [];

  for (const epic of epics) {
    rendered.push({
      relativePath: epicAgentPath(epic.id),
      content: renderEpicAgent(templateContent, epic, UNASSIGNED_DOMAIN),
    });
    rendered.push({
      relativePath: epicMemoryPath(epic.id),
      content: epicMemoryContent(epic),
    });
  }

  return rendered;
}

/**
 * Reads the epic-agent template from the templates directory.
 *
 * @param templatesDir - Absolute path to the templates directory
 * @returns Raw template content
 */
export async function readEpicAgentTemplate(
  templatesDir: string,
): Promise<string> {
  const templatePath = join(templatesDir, ".claude", "agents", "epic-agent.md");
  return readFile(templatePath, "utf-8");
}
