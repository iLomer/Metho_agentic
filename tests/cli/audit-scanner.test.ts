import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  scanLayer,
  skipLayer,
  layerPassed,
  getFailedResults,
} from "../../src/cli/audit/scanner.js";
import type { BlueprintLayer, BlueprintExpectation } from "../../src/cli/audit/blueprint.js";

// ---------------------------------------------------------------------------
// Helpers to build test layers
// ---------------------------------------------------------------------------

function makeExpectation(
  overrides: Partial<BlueprintExpectation> & { id: string },
): BlueprintExpectation {
  return {
    description: overrides.description ?? `Check ${overrides.id}`,
    checkType: overrides.checkType ?? "file-exists",
    path: overrides.path ?? "some-file.txt",
    layer: overrides.layer ?? 0,
    fixable: overrides.fixable ?? false,
    ...overrides,
  };
}

function makeLayer(
  id: number,
  expectations: BlueprintExpectation[],
): BlueprintLayer {
  return { id, name: `Layer ${id}`, expectations };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("scanLayer -- file-exists", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = join(tmpdir(), `meto-scan-file-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("returns pass when the file exists", async () => {
    await writeFile(join(tempDir, "hello.txt"), "content");
    const layer = makeLayer(0, [
      makeExpectation({ id: "test-file", path: "hello.txt", checkType: "file-exists" }),
    ]);

    const result = await scanLayer(tempDir, layer);
    expect(result.skipped).toBe(false);
    expect(result.results).toHaveLength(1);
    expect(result.results[0].status).toBe("pass");
    expect(result.results[0].message).toContain("Found hello.txt");
  });

  it("returns fail when the file does not exist", async () => {
    const layer = makeLayer(0, [
      makeExpectation({ id: "test-missing", path: "missing.txt", checkType: "file-exists" }),
    ]);

    const result = await scanLayer(tempDir, layer);
    expect(result.results[0].status).toBe("fail");
    expect(result.results[0].message).toContain("Missing missing.txt");
  });

  it("returns fail when path is a directory, not a file", async () => {
    await mkdir(join(tempDir, "subdir"), { recursive: true });
    const layer = makeLayer(0, [
      makeExpectation({ id: "test-dir-as-file", path: "subdir", checkType: "file-exists" }),
    ]);

    const result = await scanLayer(tempDir, layer);
    expect(result.results[0].status).toBe("fail");
  });
});

describe("scanLayer -- dir-exists", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = join(tmpdir(), `meto-scan-dir-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("returns pass when the directory exists", async () => {
    await mkdir(join(tempDir, "subdir"));
    const layer = makeLayer(0, [
      makeExpectation({ id: "test-dir", path: "subdir", checkType: "dir-exists" }),
    ]);

    const result = await scanLayer(tempDir, layer);
    expect(result.results[0].status).toBe("pass");
    expect(result.results[0].message).toContain("Found subdir/");
  });

  it("returns fail when the directory does not exist", async () => {
    const layer = makeLayer(0, [
      makeExpectation({ id: "test-no-dir", path: "no-dir", checkType: "dir-exists" }),
    ]);

    const result = await scanLayer(tempDir, layer);
    expect(result.results[0].status).toBe("fail");
    expect(result.results[0].message).toContain("Missing no-dir/");
  });

  it("returns fail when path is a file, not a directory", async () => {
    await writeFile(join(tempDir, "afile"), "content");
    const layer = makeLayer(0, [
      makeExpectation({ id: "test-file-as-dir", path: "afile", checkType: "dir-exists" }),
    ]);

    const result = await scanLayer(tempDir, layer);
    expect(result.results[0].status).toBe("fail");
  });
});

describe("scanLayer -- file-contains", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = join(tmpdir(), `meto-scan-contains-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("returns pass when file contains the expected pattern", async () => {
    await writeFile(join(tempDir, "doc.md"), "# Commit conventions\nSome rules here");
    const layer = makeLayer(0, [
      makeExpectation({
        id: "test-contains",
        path: "doc.md",
        checkType: "file-contains",
        containsPattern: "Commit",
      }),
    ]);

    const result = await scanLayer(tempDir, layer);
    expect(result.results[0].status).toBe("pass");
    expect(result.results[0].message).toContain("contains expected content");
  });

  it("returns pass with case-insensitive matching", async () => {
    await writeFile(join(tempDir, "doc.md"), "# DEFINITION-OF-DONE\nChecks");
    const layer = makeLayer(0, [
      makeExpectation({
        id: "test-case",
        path: "doc.md",
        checkType: "file-contains",
        containsPattern: "definition-of-done",
      }),
    ]);

    const result = await scanLayer(tempDir, layer);
    expect(result.results[0].status).toBe("pass");
  });

  it("returns fail when file does not contain the pattern", async () => {
    await writeFile(join(tempDir, "doc.md"), "# Hello\nNo matching text");
    const layer = makeLayer(0, [
      makeExpectation({
        id: "test-no-match",
        path: "doc.md",
        checkType: "file-contains",
        containsPattern: "Commit",
      }),
    ]);

    const result = await scanLayer(tempDir, layer);
    expect(result.results[0].status).toBe("fail");
    expect(result.results[0].message).toContain("missing expected content");
  });

  it("returns fail when the file does not exist", async () => {
    const layer = makeLayer(0, [
      makeExpectation({
        id: "test-no-file",
        path: "nonexistent.md",
        checkType: "file-contains",
        containsPattern: "anything",
      }),
    ]);

    const result = await scanLayer(tempDir, layer);
    expect(result.results[0].status).toBe("fail");
  });

  it("returns skip when containsPattern is undefined", async () => {
    await writeFile(join(tempDir, "doc.md"), "content");
    const layer = makeLayer(0, [
      makeExpectation({
        id: "test-no-pattern",
        path: "doc.md",
        checkType: "file-contains",
        // deliberately omitting containsPattern
      }),
    ]);

    const result = await scanLayer(tempDir, layer);
    expect(result.results[0].status).toBe("skip");
    expect(result.results[0].message).toContain("No containsPattern");
  });
});

describe("scanLayer -- custom checks", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = join(tmpdir(), `meto-scan-custom-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("README glob: passes when README.md exists", async () => {
    await writeFile(join(tempDir, "README.md"), "# Hello");
    const layer = makeLayer(0, [
      makeExpectation({
        id: "test-readme",
        path: "README*",
        checkType: "custom",
      }),
    ]);

    const result = await scanLayer(tempDir, layer);
    expect(result.results[0].status).toBe("pass");
    expect(result.results[0].message).toContain("README file found");
  });

  it("README glob: passes with case-insensitive match (readme.md)", async () => {
    await writeFile(join(tempDir, "readme.md"), "# Hello");
    const layer = makeLayer(0, [
      makeExpectation({
        id: "test-readme-lower",
        path: "README*",
        checkType: "custom",
      }),
    ]);

    const result = await scanLayer(tempDir, layer);
    expect(result.results[0].status).toBe("pass");
  });

  it("README glob: fails when no README file exists", async () => {
    await writeFile(join(tempDir, "something.txt"), "content");
    const layer = makeLayer(0, [
      makeExpectation({
        id: "test-no-readme",
        path: "README*",
        checkType: "custom",
      }),
    ]);

    const result = await scanLayer(tempDir, layer);
    expect(result.results[0].status).toBe("fail");
    expect(result.results[0].message).toContain("No README file found");
  });

  it("alternative dirs: passes when one of the dirs exists", async () => {
    await mkdir(join(tempDir, "lib"));
    const layer = makeLayer(0, [
      makeExpectation({
        id: "test-alt-dirs",
        path: "src|lib|app",
        checkType: "custom",
      }),
    ]);

    const result = await scanLayer(tempDir, layer);
    expect(result.results[0].status).toBe("pass");
    expect(result.results[0].message).toContain("Source code directory found");
  });

  it("alternative dirs: fails when none of the dirs exist", async () => {
    const layer = makeLayer(0, [
      makeExpectation({
        id: "test-no-alt",
        path: "src|lib|app",
        checkType: "custom",
      }),
    ]);

    const result = await scanLayer(tempDir, layer);
    expect(result.results[0].status).toBe("fail");
    expect(result.results[0].message).toContain("No source directory found");
  });

  it("custom fallback: treats unknown custom as file-exists", async () => {
    await writeFile(join(tempDir, "special.txt"), "data");
    const layer = makeLayer(0, [
      makeExpectation({
        id: "test-fallback",
        path: "special.txt",
        checkType: "custom",
      }),
    ]);

    const result = await scanLayer(tempDir, layer);
    expect(result.results[0].status).toBe("pass");
  });
});

describe("scanLayer -- multiple expectations", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = join(tmpdir(), `meto-scan-multi-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("returns results for all expectations in order", async () => {
    await writeFile(join(tempDir, "exists.txt"), "content");
    const layer = makeLayer(0, [
      makeExpectation({ id: "e1", path: "exists.txt", checkType: "file-exists" }),
      makeExpectation({ id: "e2", path: "missing.txt", checkType: "file-exists" }),
      makeExpectation({ id: "e3", path: "also-missing.txt", checkType: "file-exists" }),
    ]);

    const result = await scanLayer(tempDir, layer);
    expect(result.results).toHaveLength(3);
    expect(result.results[0].status).toBe("pass");
    expect(result.results[1].status).toBe("fail");
    expect(result.results[2].status).toBe("fail");
  });
});

describe("skipLayer", () => {
  it("marks all expectations as skip with the given reason", () => {
    const layer = makeLayer(1, [
      makeExpectation({ id: "s1", layer: 1 }),
      makeExpectation({ id: "s2", layer: 1 }),
    ]);

    const result = skipLayer(layer, "Layer 0 failed");
    expect(result.skipped).toBe(true);
    expect(result.skipReason).toBe("Layer 0 failed");
    expect(result.results).toHaveLength(2);
    for (const r of result.results) {
      expect(r.status).toBe("skip");
      expect(r.message).toBe("Layer 0 failed");
    }
  });
});

describe("layerPassed", () => {
  it("returns true when all results are pass", async () => {
    const tempDir = join(tmpdir(), `meto-scan-pass-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    await writeFile(join(tempDir, "a.txt"), "data");
    await writeFile(join(tempDir, "b.txt"), "data");

    const layer = makeLayer(0, [
      makeExpectation({ id: "p1", path: "a.txt" }),
      makeExpectation({ id: "p2", path: "b.txt" }),
    ]);

    const result = await scanLayer(tempDir, layer);
    expect(layerPassed(result)).toBe(true);
    await rm(tempDir, { recursive: true, force: true });
  });

  it("returns false when any result is fail", async () => {
    const tempDir = join(tmpdir(), `meto-scan-fail-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    await writeFile(join(tempDir, "a.txt"), "data");

    const layer = makeLayer(0, [
      makeExpectation({ id: "p1", path: "a.txt" }),
      makeExpectation({ id: "p2", path: "missing.txt" }),
    ]);

    const result = await scanLayer(tempDir, layer);
    expect(layerPassed(result)).toBe(false);
    await rm(tempDir, { recursive: true, force: true });
  });

  it("returns false for a skipped layer", () => {
    const layer = makeLayer(1, [makeExpectation({ id: "x1", layer: 1 })]);
    const result = skipLayer(layer, "gated");
    expect(layerPassed(result)).toBe(false);
  });
});

describe("getFailedResults", () => {
  it("returns only failed results", async () => {
    const tempDir = join(tmpdir(), `meto-scan-failed-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    await writeFile(join(tempDir, "a.txt"), "data");

    const layer = makeLayer(0, [
      makeExpectation({ id: "g1", path: "a.txt" }),
      makeExpectation({ id: "g2", path: "nope.txt" }),
      makeExpectation({ id: "g3", path: "also-nope.txt" }),
    ]);

    const result = await scanLayer(tempDir, layer);
    const failed = getFailedResults(result);
    expect(failed).toHaveLength(2);
    expect(failed.every((r) => r.status === "fail")).toBe(true);
    await rm(tempDir, { recursive: true, force: true });
  });

  it("returns empty array when all pass", async () => {
    const tempDir = join(tmpdir(), `meto-scan-allpass-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    await writeFile(join(tempDir, "a.txt"), "data");

    const layer = makeLayer(0, [
      makeExpectation({ id: "g1", path: "a.txt" }),
    ]);

    const result = await scanLayer(tempDir, layer);
    expect(getFailedResults(result)).toHaveLength(0);
    await rm(tempDir, { recursive: true, force: true });
  });
});
