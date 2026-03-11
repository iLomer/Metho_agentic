import { spawn } from "node:child_process";
import type { TechStack } from "./types.js";
import { getStackDescription } from "./stacks.js";

/**
 * Minimal context the user provides before AI takes over generation.
 */
export interface AIGenerationContext {
  projectName: string;
  description: string;
  targetUsers: string;
  techStack: TechStack;
  customStack: string | undefined;
}

/**
 * Result of a successful AI generation subprocess call.
 */
export interface AIGenerationResult {
  /** Raw stdout output from the Claude Code subprocess. */
  raw: string;
}

/**
 * Error thrown when the Claude Code subprocess exits with a non-zero code.
 */
export class AIGenerationError extends Error {
  /** The stderr output from the failed subprocess. */
  readonly stderr: string;
  /** The exit code from the subprocess (null if terminated by signal). */
  readonly exitCode: number | null;

  constructor(stderr: string, exitCode: number | null) {
    const codeInfo = exitCode !== null ? ` (exit code ${exitCode})` : "";
    super(`AI generation failed${codeInfo}: ${stderr}`);
    this.name = "AIGenerationError";
    this.stderr = stderr;
    this.exitCode = exitCode;
  }
}

/**
 * Error thrown when the Claude Code subprocess exceeds the timeout.
 */
export class AIGenerationTimeoutError extends Error {
  /** The timeout duration in milliseconds. */
  readonly timeoutMs: number;

  constructor(timeoutMs: number) {
    const seconds = Math.round(timeoutMs / 1000);
    super(`AI generation timed out after ${seconds} seconds`);
    this.name = "AIGenerationTimeoutError";
    this.timeoutMs = timeoutMs;
  }
}

/**
 * Default inactivity timeout for the AI generation subprocess (60 seconds).
 * The timer resets whenever stdout data arrives, so long-running but active
 * generations won't be killed prematurely.
 */
const DEFAULT_TIMEOUT_MS = 60_000;

/**
 * Extracts plain text from Claude Code stream-json (JSONL) output.
 *
 * Each line is a JSON object. Text content arrives as content_block_delta
 * events with text_delta payloads. We concatenate all text_delta values.
 */
export function extractTextFromStream(jsonlStream: string): string {
  const lines = jsonlStream.split("\n").filter((line) => line.trim());
  let fullText = "";

  for (const line of lines) {
    try {
      const event: Record<string, unknown> = JSON.parse(line);
      const inner = event.event as Record<string, unknown> | undefined;
      if (
        event.type === "stream_event" &&
        inner?.type === "content_block_delta"
      ) {
        const delta = inner.delta as Record<string, unknown> | undefined;
        if (delta?.type === "text_delta" && typeof delta.text === "string") {
          fullText += delta.text;
        }
      }
    } catch {
      // Skip malformed lines
    }
  }

  return fullText;
}

/**
 * Builds the structured prompt that instructs Claude Code to generate project content.
 *
 * The prompt specifies section markers so the output can be deterministically parsed.
 * Each section is delimited by `---SECTION:<NAME>---` and `---END:<NAME>---` markers.
 */
export function buildAIPrompt(context: AIGenerationContext): string {
  const stackDescription =
    context.techStack === "custom"
      ? context.customStack ?? "Custom stack"
      : getStackDescription(context.techStack);

  return `You are a senior product manager and technical architect. Based on the project brief below, generate structured project content for a software project scaffold.

PROJECT BRIEF:
- Name: ${context.projectName}
- Description: ${context.description}
- Target Users: ${context.targetUsers}
- Tech Stack: ${stackDescription}

Generate the following sections. Each section MUST be wrapped in markers exactly as shown. Do not include the markers inside the content itself.

---SECTION:PRODUCT_VISION---
Write an expanded product vision (3-5 paragraphs). Cover what the product does, why it matters, who it serves, and what differentiates it. Be specific and actionable, not generic.
---END:PRODUCT_VISION---

---SECTION:PROBLEM_STATEMENT---
Write a clear problem statement (2-3 paragraphs). Describe the pain point, who experiences it, and why existing solutions fall short.
---END:PROBLEM_STATEMENT---

---SECTION:SUCCESS_CRITERIA---
Write 5-8 measurable success criteria as a markdown bullet list. Each criterion should be specific and verifiable (e.g., "New user can complete onboarding in under 2 minutes").
---END:SUCCESS_CRITERIA---

---SECTION:VALUE_PROPOSITION---
Write a one-line value proposition that captures the core benefit. Follow it with 2-3 supporting sentences.
---END:VALUE_PROPOSITION---

---SECTION:OUT_OF_SCOPE---
Write 5-8 items that are explicitly out of scope for v1 as a markdown bullet list. Be specific about what will NOT be built.
---END:OUT_OF_SCOPE---

---SECTION:EPICS---
Generate 4-6 epics. Each epic must follow this exact format:

## E1 -- [Epic Title]
**Goal:** [One sentence describing the outcome]
**Status:** Not started
**Tasks:** To be sliced by @meto-pm

---

## E2 -- [Epic Title]
**Goal:** [One sentence describing the outcome]
**Status:** Not started
**Tasks:** To be sliced by @meto-pm

Continue for E3, E4, etc. Epics should progress logically from setup through core features to deployment.
---END:EPICS---

---SECTION:STARTER_TASKS---
Slice the FIRST epic (E1) into 3-5 task slices. Each task must follow this exact format:

## [slice-001] -- [Task Title]
**Epic:** E1 | **Size:** S | **Depends on:** none

**User Story**
As a [role], I want [capability] so that [benefit].

**Acceptance Criteria**
- [ ] [Specific, testable criterion]
- [ ] [Another criterion]
- [ ] [At least 3 criteria per task]

**Out of Scope**
[What this task does NOT include]

---

Continue with [slice-002], [slice-003], etc. Tasks should be small enough to complete in one session.
---END:STARTER_TASKS---

---SECTION:DEFINITION_OF_DONE---
Write a Definition of Done checklist with two sections:

## Universal Checks
- [ ] [5-6 universal quality checks appropriate for the tech stack]

## Stack-Specific Checks
- [ ] [4-5 checks specific to the chosen technology]
---END:DEFINITION_OF_DONE---

IMPORTANT: Output ONLY the sections above with their markers. No introduction, no conclusion, no commentary outside the markers.`;
}

/**
 * Invokes Claude Code as a subprocess with a structured prompt and returns the raw output.
 *
 * The function spawns `claude` with the `-p` flag, passing the generation prompt.
 * It captures stdout and returns it as a raw string for downstream parsing.
 *
 * @param context - The minimal project context collected from the user
 * @param timeoutMs - Maximum time to wait for the subprocess (default 90 seconds)
 * @returns The raw stdout output from Claude Code
 * @throws {AIGenerationTimeoutError} If the subprocess exceeds the timeout
 * @throws {AIGenerationError} If the subprocess exits with a non-zero code
 */
export function generateWithAI(
  context: AIGenerationContext,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<AIGenerationResult> {
  const prompt = buildAIPrompt(context);

  return new Promise((resolve, reject) => {
    const child = spawn(
      "claude",
      ["-p", "--output-format", "stream-json", prompt],
      { stdio: ["ignore", "pipe", "pipe"] },
    );

    let rawStream = "";
    let stderr = "";
    let settled = false;

    const resetTimer = (): NodeJS.Timeout =>
      setTimeout(() => {
        settled = true;
        child.kill("SIGTERM");
        reject(new AIGenerationTimeoutError(timeoutMs));
      }, timeoutMs);

    let timer = resetTimer();

    child.stdout.on("data", (chunk: Buffer) => {
      rawStream += chunk.toString();
      // Activity detected — restart the inactivity timer
      if (!settled) {
        clearTimeout(timer);
        timer = resetTimer();
      }
    });

    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      if (settled) return;
      settled = true;

      if (code !== 0) {
        reject(new AIGenerationError(stderr, code));
        return;
      }

      // Extract text content from stream-json JSONL output
      const text = extractTextFromStream(rawStream);
      resolve({ raw: text });
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      if (settled) return;
      settled = true;
      reject(new AIGenerationError(err.message, null));
    });
  });
}
