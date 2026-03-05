import { describe, it, expect, afterEach } from "vitest";
import { spawn } from "node:child_process";
import { readFile, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const CURRENT_DIR = fileURLToPath(new URL(".", import.meta.url));
const PROJECT_ROOT = join(CURRENT_DIR, "..", "..");
const CLI_ENTRY = join(PROJECT_ROOT, "dist", "cli", "index.js");
const MOCK_CLAUDE_OK_DIR = join(CURRENT_DIR, "..", "fixtures", "mock-claude-ok");
const MOCK_CLAUDE_ERR_DIR = join(CURRENT_DIR, "..", "fixtures", "mock-claude-err");

/** Carriage return -- what terminals send when the user presses Enter. */
const CR = "\r";

/** Delay between sending answers to give clack time to render each prompt. */
const PROMPT_DELAY_MS = 500;

/**
 * Sends a sequence of answers to a child process's stdin with delays.
 */
function sendAnswersSequentially(
  stdin: NodeJS.WritableStream,
  answers: string[],
): Promise<void> {
  return new Promise((resolve) => {
    let index = 0;

    function sendNext(): void {
      if (index >= answers.length) {
        resolve();
        return;
      }

      setTimeout(() => {
        stdin.write(answers[index]);
        index++;
        sendNext();
      }, PROMPT_DELAY_MS);
    }

    sendNext();
  });
}

/**
 * Spawns the CLI with a custom PATH that includes the fixtures directory.
 * This allows mock `claude` scripts to be found before the real one.
 */
function runCliWithMockClaude(
  args: string[],
  answers: string[],
  mockDir: string = MOCK_CLAUDE_OK_DIR,
): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const env = {
      ...process.env,
      FORCE_COLOR: "0",
      PATH: `${mockDir}:${process.env.PATH ?? ""}`,
    };

    const child = spawn("node", [CLI_ENTRY, ...args], {
      stdio: ["pipe", "pipe", "pipe"],
      env,
      cwd: PROJECT_ROOT,
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data: Buffer) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    child.on("error", reject);

    child.on("close", (code) => {
      resolve({ code, stdout, stderr });
    });

    sendAnswersSequentially(child.stdin, answers).catch(reject);
  });
}

describe("meto-cli init with AI (integration)", () => {
  let outputDir: string;

  afterEach(async () => {
    if (outputDir) {
      await rm(outputDir, { recursive: true, force: true });
    }
  });

  it("scaffolds with AI-generated content when mock claude succeeds", { timeout: 60_000 }, async () => {
    const projectName = `ai-e2e-test-${Date.now()}`;
    outputDir = join(tmpdir(), projectName);

    const answers = [
      CR,                          // 1. Confirm AI usage (yes, default)
      projectName + CR,            // 2. Project name
      "An AI integration test" + CR, // 3. Description
      "Developers" + CR,           // 4. Target users
      CR,                          // 5. Stack (first = nextjs-supabase)
      outputDir + CR,              // 6. Output directory (AI skips deep prompts)
    ];

    const result = await runCliWithMockClaude(["init"], answers);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("Done. Happy building!");

    // Verify output directory was created
    const dirStat = await stat(outputDir);
    expect(dirStat.isDirectory()).toBe(true);

    // Verify AI-generated content appears in scaffold files
    const backlog = await readFile(
      join(outputDir, "ai", "tasks", "tasks-backlog.md"),
      "utf-8",
    );
    expect(backlog).toContain("[slice-001]");
    expect(backlog).toContain("Initialize project structure");

    const epics = await readFile(
      join(outputDir, "ai", "backlog", "epics.md"),
      "utf-8",
    );
    expect(epics).toContain("E1 -- Project Setup");
    expect(epics).toContain("E2 -- Core Feature");
  });

  it("falls back to static prompts with --no-ai flag", { timeout: 60_000 }, async () => {
    const projectName = `noai-e2e-test-${Date.now()}`;
    outputDir = join(tmpdir(), projectName);

    const answers = [
      projectName + CR,          // 1. Project name
      "A no-ai test project" + CR, // 2. Description
      "Developers" + CR,         // 3. Target users
      CR,                        // 4. Stack (first = nextjs-supabase)
      CR,                        // 5. Problem statement (default)
      CR,                        // 6. Success criteria (default)
      CR,                        // 7. Value proposition (default)
      CR,                        // 8. Out of scope (default)
      CR,                        // 9. Code conventions (default)
      outputDir + CR,            // 10. Output directory
    ];

    const result = await runCliWithMockClaude(["init", "--no-ai"], answers);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("Done. Happy building!");
    expect(result.stdout).toContain("AI generation disabled via --no-ai flag");

    // Verify scaffold was created with static defaults
    const dirStat = await stat(outputDir);
    expect(dirStat.isDirectory()).toBe(true);

    const claudeMd = await readFile(
      join(outputDir, "CLAUDE.md"),
      "utf-8",
    );
    expect(claudeMd).toContain(projectName);
    expect(claudeMd).not.toContain("{{PROJECT_NAME}}");
  });
});
