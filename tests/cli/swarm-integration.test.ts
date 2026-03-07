import { describe, it, expect, afterEach } from "vitest";
import { spawn } from "node:child_process";
import { readdir, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const CURRENT_DIR = fileURLToPath(new URL(".", import.meta.url));
const PROJECT_ROOT = join(CURRENT_DIR, "..", "..");
const CLI_ENTRY = join(PROJECT_ROOT, "dist", "cli", "index.js");

/** Carriage return -- what terminals send when the user presses Enter. */
const CR = "\r";

/** Arrow down -- ANSI escape sequence for moving cursor down in select prompts. */
const ARROW_DOWN = "\x1B[B";

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
 * Spawns the CLI and collects stdout/stderr until the process exits.
 * Returns the exit code, stdout, and stderr.
 */
function runCli(
  args: string[],
  answers: string[],
  options?: { cwd?: string },
): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn("node", [CLI_ENTRY, ...args], {
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, FORCE_COLOR: "0" },
      cwd: options?.cwd ?? PROJECT_ROOT,
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

/**
 * Recursively collects all file paths under a directory, relative to that directory.
 */
async function collectFilesRecursive(
  dir: string,
  prefix: string = "",
): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const results: string[] = [];

  for (const entry of entries) {
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      if (entry.name === ".git") continue;
      const nested = await collectFilesRecursive(
        join(dir, entry.name),
        relativePath,
      );
      results.push(...nested);
    } else {
      results.push(relativePath);
    }
  }

  return results;
}

describe("meto-cli init -- swarm mode (integration)", () => {
  let outputDir: string;

  afterEach(async () => {
    if (outputDir) {
      await rm(outputDir, { recursive: true, force: true });
    }
  });

  it("scaffolds with swarm files and epic agents when swarm mode selected", { timeout: 30_000 }, async () => {
    const projectName = `swarm-e2e-${Date.now()}`;
    outputDir = join(tmpdir(), projectName);

    const answers = [
      projectName + CR,                // 1. Project name
      "A swarm integration test" + CR, // 2. Description
      "Developers" + CR,               // 3. Target users
      CR,                              // 4. Stack (first = nextjs-supabase)
      CR,                              // 5. Problem statement (default)
      CR,                              // 6. Success criteria (default)
      CR,                              // 7. Value proposition (default)
      CR,                              // 8. Out of scope (default)
      CR,                              // 9. Code conventions (default)
      outputDir + CR,                  // 10. Output directory
      ARROW_DOWN + CR,                 // 11. Workflow mode (arrow down to select swarm)
    ];

    const result = await runCli(["init", "--no-ai"], answers);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("Done. Happy building!");

    // Verify output directory was created
    const dirStat = await stat(outputDir);
    expect(dirStat.isDirectory()).toBe(true);

    // Collect all files in the scaffold
    const allFiles = await collectFilesRecursive(outputDir);

    // Verify swarm-specific files exist
    const swarmFiles = [
      "ai/swarm/SWARM_AWARENESS.md",
      "ai/swarm/domain-map.md",
      "ai/workflows/swarm-workflow.md",
    ];

    for (const filePath of swarmFiles) {
      const fullPath = join(outputDir, filePath);
      const fileStat = await stat(fullPath);
      expect(
        fileStat.isFile(),
        `Expected swarm file to exist: ${filePath}`,
      ).toBe(true);
    }

    // Verify at least one epic-agent file was generated
    const epicAgentFiles = allFiles.filter((f) =>
      f.match(/\.claude\/agents\/epic-agent-E\d+\.md$/),
    );
    expect(
      epicAgentFiles.length,
      "Expected at least one epic-agent file",
    ).toBeGreaterThanOrEqual(1);

    // Verify epic agent memory files were also generated
    const epicMemoryFiles = allFiles.filter((f) =>
      f.match(/\.claude\/agent-memory\/meto-epic-E\d+\/MEMORY\.md$/),
    );
    expect(
      epicMemoryFiles.length,
      "Expected at least one epic agent memory file",
    ).toBeGreaterThanOrEqual(1);

    // Verify standard files still exist
    const standardFiles = [
      "CLAUDE.md",
      "ai/tasks/tasks-backlog.md",
      "ai/context/product-vision.md",
      ".gitignore",
      ".claude/settings.json",
    ];

    for (const filePath of standardFiles) {
      const fullPath = join(outputDir, filePath);
      const fileStat = await stat(fullPath);
      expect(
        fileStat.isFile(),
        `Expected standard file to exist: ${filePath}`,
      ).toBe(true);
    }
  });

  it("does NOT include swarm files when sprint mode selected", { timeout: 30_000 }, async () => {
    const projectName = `sprint-e2e-${Date.now()}`;
    outputDir = join(tmpdir(), projectName);

    const answers = [
      projectName + CR,                 // 1. Project name
      "A sprint integration test" + CR, // 2. Description
      "Developers" + CR,                // 3. Target users
      CR,                               // 4. Stack (first = nextjs-supabase)
      CR,                               // 5. Problem statement (default)
      CR,                               // 6. Success criteria (default)
      CR,                               // 7. Value proposition (default)
      CR,                               // 8. Out of scope (default)
      CR,                               // 9. Code conventions (default)
      outputDir + CR,                   // 10. Output directory
      CR,                               // 11. Workflow mode (first = sprint)
    ];

    const result = await runCli(["init", "--no-ai"], answers);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("Done. Happy building!");

    // Collect all files in the scaffold
    const allFiles = await collectFilesRecursive(outputDir);

    // Verify NO swarm files exist
    const swarmFiles = allFiles.filter((f) =>
      f.startsWith("ai/swarm/"),
    );
    expect(
      swarmFiles,
      "Sprint mode should not include any ai/swarm/ files",
    ).toEqual([]);

    // Verify NO epic-agent files exist
    const epicAgentFiles = allFiles.filter((f) =>
      f.match(/epic-agent-E\d+\.md$/),
    );
    expect(
      epicAgentFiles,
      "Sprint mode should not include any epic-agent files",
    ).toEqual([]);

    // Verify standard files still exist (regression check)
    const standardFiles = [
      "CLAUDE.md",
      "ai/tasks/tasks-backlog.md",
      ".gitignore",
    ];

    for (const filePath of standardFiles) {
      const fullPath = join(outputDir, filePath);
      const fileStat = await stat(fullPath);
      expect(
        fileStat.isFile(),
        `Expected standard file to exist: ${filePath}`,
      ).toBe(true);
    }
  });
});

describe("meto-cli status (integration)", () => {
  let scaffoldDir: string;

  afterEach(async () => {
    if (scaffoldDir) {
      await rm(scaffoldDir, { recursive: true, force: true });
    }
  });

  it("prints dashboard and exits 0 from a swarm-mode scaffold", { timeout: 45_000 }, async () => {
    // First, scaffold a swarm-mode project
    const projectName = `status-swarm-${Date.now()}`;
    scaffoldDir = join(tmpdir(), projectName);

    const initAnswers = [
      projectName + CR,
      "A status test project" + CR,
      "Developers" + CR,
      CR,                      // Stack
      CR,                      // Problem
      CR,                      // Success
      CR,                      // Value
      CR,                      // Out of scope
      CR,                      // Conventions
      scaffoldDir + CR,        // Output directory
      ARROW_DOWN + CR,         // Swarm mode
    ];

    const initResult = await runCli(["init", "--no-ai"], initAnswers);
    expect(initResult.code).toBe(0);

    // Now run status from inside the scaffold
    const statusResult = await runCli(["status"], [], { cwd: scaffoldDir });

    expect(statusResult.code).toBe(0);
    expect(statusResult.stdout).toContain("meto-cli status");
    expect(statusResult.stdout).toContain("Swarm Dashboard");
    expect(statusResult.stdout).toContain("Status complete.");
  });

  it("prints error and exits 1 from a sprint-mode scaffold", { timeout: 45_000 }, async () => {
    // First, scaffold a sprint-mode project
    const projectName = `status-sprint-${Date.now()}`;
    scaffoldDir = join(tmpdir(), projectName);

    const initAnswers = [
      projectName + CR,
      "A sprint status test" + CR,
      "Developers" + CR,
      CR,                      // Stack
      CR,                      // Problem
      CR,                      // Success
      CR,                      // Value
      CR,                      // Out of scope
      CR,                      // Conventions
      scaffoldDir + CR,        // Output directory
      CR,                      // Sprint mode (default)
    ];

    const initResult = await runCli(["init", "--no-ai"], initAnswers);
    expect(initResult.code).toBe(0);

    // Now run status from inside the scaffold
    const statusResult = await runCli(["status"], [], { cwd: scaffoldDir });

    expect(statusResult.code).toBe(1);
    expect(statusResult.stdout).toContain("not using swarm mode");
  });
});
