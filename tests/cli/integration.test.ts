import { describe, it, expect, afterEach } from "vitest";
import { spawn } from "node:child_process";
import { readdir, readFile, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const CURRENT_DIR = fileURLToPath(new URL(".", import.meta.url));
const PROJECT_ROOT = join(CURRENT_DIR, "..", "..");
const CLI_ENTRY = join(PROJECT_ROOT, "dist", "cli", "index.js");

/** Carriage return — what terminals send when the user presses Enter. */
const CR = "\r";

/** Delay between sending answers to give clack time to render each prompt. */
const PROMPT_DELAY_MS = 500;

/**
 * Sends a sequence of answers to a child process's stdin with delays.
 * Each answer is written as a string followed by the next answer after a delay.
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
): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn("node", [CLI_ENTRY, ...args], {
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, FORCE_COLOR: "0" },
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

describe("meto-cli init (integration)", () => {
  let outputDir: string;

  afterEach(async () => {
    if (outputDir) {
      await rm(outputDir, { recursive: true, force: true });
    }
  });

  it("scaffolds a complete project with all expected files and git init", { timeout: 30_000 }, async () => {
    const projectName = `e2e-test-${Date.now()}`;
    outputDir = join(tmpdir(), projectName);

    const answers = [
      projectName + CR,          // 1. Project name
      "An integration test project" + CR, // 2. Description
      "Developers" + CR,         // 3. Target users
      CR,                        // 4. Stack (first = nextjs-supabase)
      CR,                        // 5. Problem statement (default)
      CR,                        // 6. Success criteria (default)
      CR,                        // 7. Value proposition (default)
      CR,                        // 8. Out of scope (default)
      CR,                        // 9. Code conventions (default)
      outputDir + CR,            // 10. Output directory
    ];

    const result = await runCli(["init"], answers);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("Done. Happy building!");

    // Verify output directory was created
    const dirStat = await stat(outputDir);
    expect(dirStat.isDirectory()).toBe(true);

    // Verify expected files exist
    const expectedFiles = [
      "CLAUDE.md",
      join("ai", "tasks", "tasks-backlog.md"),
      join("ai", "context", "product-vision.md"),
      ".gitignore",
    ];

    for (const filePath of expectedFiles) {
      const fullPath = join(outputDir, filePath);
      const fileStat = await stat(fullPath);
      expect(
        fileStat.isFile(),
        `Expected file to exist: ${filePath}`,
      ).toBe(true);
    }

    // Verify project name token was replaced in at least one file
    const claudeMd = await readFile(
      join(outputDir, "CLAUDE.md"),
      "utf-8",
    );
    expect(claudeMd).toContain(projectName);
    expect(claudeMd).not.toContain("{{PROJECT_NAME}}");

    // Verify .git directory exists (git init ran)
    const gitDirStat = await stat(join(outputDir, ".git"));
    expect(gitDirStat.isDirectory()).toBe(true);

    // Verify no double-nesting: there should be no subfolder named after the project
    const topEntries = await readdir(outputDir);
    expect(topEntries).not.toContain(projectName);

    // Verify src/ directory exists with .gitkeep inside
    const srcDirStat = await stat(join(outputDir, "src"));
    expect(srcDirStat.isDirectory()).toBe(true);
    const gitkeepStat = await stat(join(outputDir, "src", ".gitkeep"));
    expect(gitkeepStat.isFile()).toBe(true);
  });
});
