import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, rm, writeFile, chmod } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir, platform } from "node:os";
import {
  parseNodeMajorVersion,
  checkNodeVersion,
  checkGitAvailable,
  checkWritePermission,
} from "../../src/cli/preflight.js";

describe("parseNodeMajorVersion", () => {
  it("parses major version from standard format", () => {
    expect(parseNodeMajorVersion("v18.12.0")).toBe(18);
  });

  it("parses major version from v20", () => {
    expect(parseNodeMajorVersion("v20.0.0")).toBe(20);
  });

  it("parses single-digit major version", () => {
    expect(parseNodeMajorVersion("v8.0.0")).toBe(8);
  });

  it("returns NaN for empty string", () => {
    expect(parseNodeMajorVersion("")).toBeNaN();
  });

  it("returns NaN for string without v prefix", () => {
    expect(parseNodeMajorVersion("18.12.0")).toBeNaN();
  });
});

describe("checkNodeVersion", () => {
  it("returns undefined when version meets the minimum", () => {
    expect(checkNodeVersion("v18.0.0", 18)).toBeUndefined();
  });

  it("returns undefined when version exceeds the minimum", () => {
    expect(checkNodeVersion("v22.1.0", 18)).toBeUndefined();
  });

  it("returns error message when version is below minimum", () => {
    const result = checkNodeVersion("v16.20.0", 18);
    expect(result).toBe(
      "Lom requires Node.js 18 or later. You are running v16.20.0.",
    );
  });

  it("returns error message for unparseable version", () => {
    const result = checkNodeVersion("garbage", 18);
    expect(result).toBe(
      "Lom requires Node.js 18 or later. You are running garbage.",
    );
  });
});

describe("checkGitAvailable", () => {
  it("returns true when git is installed", async () => {
    const result = await checkGitAvailable();
    expect(result).toBe(true);
  });
});

describe("checkWritePermission", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = join(tmpdir(), `lom-preflight-test-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    // Restore permissions before cleanup in case we changed them
    try {
      await chmod(tempDir, 0o755);
    } catch {
      // Ignore errors if dir was already removed
    }
    await rm(tempDir, { recursive: true, force: true });
  });

  it("returns undefined when parent directory is writable", async () => {
    const outputPath = join(tempDir, "new-project");
    const result = await checkWritePermission(outputPath);
    expect(result).toBeUndefined();
  });

  it("returns error message when parent directory does not exist", async () => {
    const outputPath = join(tempDir, "nonexistent", "deep", "project");
    const result = await checkWritePermission(outputPath);
    expect(result).toContain("Cannot write to");
  });

  it("returns error message containing the absolute path", async () => {
    const outputPath = join(tempDir, "nonexistent", "project");
    const result = await checkWritePermission(outputPath);
    expect(result).toContain(join(tempDir, "nonexistent", "project"));
  });

  // Permission tests only work reliably on non-Windows platforms
  if (platform() !== "win32") {
    it("returns error message when parent directory is not writable", async () => {
      const readOnlyDir = join(tempDir, "readonly");
      await mkdir(readOnlyDir, { recursive: true });
      await chmod(readOnlyDir, 0o444);

      const outputPath = join(readOnlyDir, "project");
      const result = await checkWritePermission(outputPath);
      expect(result).toContain("Cannot write to");

      // Restore so afterEach can clean up
      await chmod(readOnlyDir, 0o755);
    });
  }
});
