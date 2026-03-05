import { describe, it, expect, afterEach } from "vitest";
import { readdir, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { writeScaffold, DirectoryNotEmptyError } from "../../src/cli/scaffold.js";
import type { RenderedFile } from "../../src/cli/renderer.js";

describe("writeScaffold", () => {
  let outputDir: string;

  afterEach(async () => {
    if (outputDir) {
      await rm(outputDir, { recursive: true, force: true });
    }
  });

  it("writes files directly into the output directory without nesting", async () => {
    const projectName = "my-app";
    outputDir = join(tmpdir(), `scaffold-test-${Date.now()}`, projectName);

    const files: RenderedFile[] = [
      { relativePath: "CLAUDE.md", content: "# Test" },
      { relativePath: join("ai", "tasks", "tasks-backlog.md"), content: "# Backlog" },
    ];

    await writeScaffold(outputDir, files);

    // CLAUDE.md should exist directly in outputDir
    const claudeStat = await stat(join(outputDir, "CLAUDE.md"));
    expect(claudeStat.isFile()).toBe(true);

    // There should be NO nested subdirectory with the project name
    const entries = await readdir(outputDir);
    expect(entries).not.toContain(projectName);
  });

  it("does not double-nest when output directory matches the project name", async () => {
    const projectName = "test-project";
    outputDir = join(tmpdir(), `scaffold-nest-${Date.now()}`, projectName);

    const files: RenderedFile[] = [
      { relativePath: "CLAUDE.md", content: "# My Project" },
      { relativePath: ".gitignore", content: "node_modules/" },
    ];

    await writeScaffold(outputDir, files);

    // Files must be directly in outputDir
    const entries = await readdir(outputDir);
    expect(entries).toContain("CLAUDE.md");
    expect(entries).toContain(".gitignore");

    // No nested directory with the project name
    expect(entries).not.toContain(projectName);

    // Double-check: the nested path must not exist
    try {
      await stat(join(outputDir, projectName));
      expect.fail("Nested directory should not exist");
    } catch (error: unknown) {
      expect((error as NodeJS.ErrnoException).code).toBe("ENOENT");
    }
  });

  it("throws DirectoryNotEmptyError for non-empty directories", async () => {
    const { mkdir, writeFile } = await import("node:fs/promises");
    outputDir = join(tmpdir(), `scaffold-nonempty-${Date.now()}`);
    await mkdir(outputDir, { recursive: true });
    await writeFile(join(outputDir, "existing.txt"), "content", "utf-8");

    const files: RenderedFile[] = [
      { relativePath: "CLAUDE.md", content: "# Test" },
    ];

    await expect(writeScaffold(outputDir, files)).rejects.toThrow(
      DirectoryNotEmptyError,
    );
  });
});
