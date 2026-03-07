import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { replaceTokens } from "./renderer.js";
import type { RenderedFile } from "./renderer.js";

/**
 * Parsed epic extracted from epics markdown content.
 */
interface ParsedEpic {
  /** Epic ID, e.g. "E1" */
  id: string;
  /** Epic name, e.g. "Project Setup" */
  name: string;
}

/**
 * Parses epic IDs and names from markdown-formatted epics content.
 * Expects headings in the format: `## E1 -- Epic Name`
 *
 * @param epicsContent - Markdown string containing epic definitions
 * @returns Array of parsed epics with id and name
 */
export function parseEpics(epicsContent: string): ParsedEpic[] {
  const epicPattern = /^## (E\d+) -- (.+)$/gm;
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
    const tokens = {
      EPIC_ID: epic.id,
      EPIC_NAME: epic.name,
      EPIC_DOMAIN: "to be assigned by @meto-pm",
    };

    const agentContent = replaceTokens(templateContent, tokens);
    rendered.push({
      relativePath: `.claude/agents/epic-agent-${epic.id}.md`,
      content: agentContent,
    });

    const memoryContent = [
      `# Epic Agent Memory -- ${epic.name} (${epic.id})`,
      "",
      "*Read at session start. Update at session end. Keep it concise.*",
      "",
      "---",
      "",
      "## Current State",
      "- **Status:** not-started",
      "- **Tasks completed:** 0",
      "- **Checkpoint count:** 0",
      "",
      "## Session Log",
      "*(no sessions yet)*",
      "",
    ].join("\n");

    rendered.push({
      relativePath: `.claude/agent-memory/meto-epic-${epic.id}/MEMORY.md`,
      content: memoryContent,
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

/**
 * Generates a settings.json content with epic agent entries.
 * Merges the base settings with agent file references for swarm mode.
 *
 * @param epicIds - Array of epic IDs (e.g. ["E1", "E2", "E3"])
 * @returns Formatted JSON string for .claude/settings.json
 */
export function generateSwarmSettings(epicIds: string[]): string {
  const settings: Record<string, unknown> = {
    env: {
      CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: "1",
    },
    agents: epicIds.map((id) => ({
      slug: `meto-epic-${id.toLowerCase()}`,
      file: `.claude/agents/epic-agent-${id}.md`,
    })),
  };
  return JSON.stringify(settings, null, 2) + "\n";
}
