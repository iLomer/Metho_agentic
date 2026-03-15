import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { detectStack } from "../../src/cli/audit/detect-stack.js";

describe("detectStack", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = join(tmpdir(), `meto-detect-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  // -----------------------------------------------------------------------
  // No manifest
  // -----------------------------------------------------------------------

  it("returns custom/unknown when no manifest files exist", async () => {
    const result = await detectStack(tempDir);
    expect(result.stack).toBe("custom");
    expect(result.detectedVia).toBe("none");
    expect(result.label).toBe("Unknown");
  });

  // -----------------------------------------------------------------------
  // package.json -- Node.js variants
  // -----------------------------------------------------------------------

  it("detects Next.js from package.json with next dependency", async () => {
    await writeFile(
      join(tempDir, "package.json"),
      JSON.stringify({ dependencies: { next: "14.0.0" } }),
    );
    const result = await detectStack(tempDir);
    expect(result.stack).toBe("nextjs-supabase");
    expect(result.detectedVia).toBe("package.json");
    expect(result.label).toBe("Next.js");
  });

  it("detects Next.js from devDependencies", async () => {
    await writeFile(
      join(tempDir, "package.json"),
      JSON.stringify({ devDependencies: { next: "14.0.0" } }),
    );
    const result = await detectStack(tempDir);
    expect(result.stack).toBe("nextjs-supabase");
  });

  it("detects React Native from package.json", async () => {
    await writeFile(
      join(tempDir, "package.json"),
      JSON.stringify({ dependencies: { "react-native": "0.73.0" } }),
    );
    const result = await detectStack(tempDir);
    expect(result.stack).toBe("react-native");
    expect(result.detectedVia).toBe("package.json");
    expect(result.label).toBe("React Native");
  });

  it("detects Vite + React from package.json", async () => {
    await writeFile(
      join(tempDir, "package.json"),
      JSON.stringify({
        dependencies: { react: "18.2.0" },
        devDependencies: { vite: "5.0.0" },
      }),
    );
    const result = await detectStack(tempDir);
    expect(result.stack).toBe("vite-react");
    expect(result.detectedVia).toBe("package.json");
    expect(result.label).toBe("Vite + React");
  });

  it("falls back to nodejs-cli for a plain package.json", async () => {
    await writeFile(
      join(tempDir, "package.json"),
      JSON.stringify({ name: "my-cli", dependencies: { commander: "12.0.0" } }),
    );
    const result = await detectStack(tempDir);
    expect(result.stack).toBe("nodejs-cli");
    expect(result.detectedVia).toBe("package.json");
    expect(result.label).toBe("Node.js");
  });

  it("falls back to nodejs-cli for package.json with no dependencies", async () => {
    await writeFile(
      join(tempDir, "package.json"),
      JSON.stringify({ name: "my-project" }),
    );
    const result = await detectStack(tempDir);
    expect(result.stack).toBe("nodejs-cli");
  });

  // -----------------------------------------------------------------------
  // Priority: Next.js > React Native > Vite+React
  // -----------------------------------------------------------------------

  it("prefers Next.js over React Native when both present", async () => {
    await writeFile(
      join(tempDir, "package.json"),
      JSON.stringify({
        dependencies: { next: "14.0.0", "react-native": "0.73.0" },
      }),
    );
    const result = await detectStack(tempDir);
    expect(result.stack).toBe("nextjs-supabase");
  });

  it("prefers React Native over Vite+React when both present", async () => {
    await writeFile(
      join(tempDir, "package.json"),
      JSON.stringify({
        dependencies: { "react-native": "0.73.0", react: "18.0.0", vite: "5.0.0" },
      }),
    );
    const result = await detectStack(tempDir);
    expect(result.stack).toBe("react-native");
  });

  // -----------------------------------------------------------------------
  // Go
  // -----------------------------------------------------------------------

  it("detects Go from go.mod", async () => {
    await writeFile(join(tempDir, "go.mod"), "module example.com/myapp\n");
    const result = await detectStack(tempDir);
    expect(result.stack).toBe("go");
    expect(result.detectedVia).toBe("go.mod");
    expect(result.label).toBe("Go");
  });

  // -----------------------------------------------------------------------
  // Python
  // -----------------------------------------------------------------------

  it("detects Python from pyproject.toml", async () => {
    await writeFile(join(tempDir, "pyproject.toml"), "[project]\nname = 'app'");
    const result = await detectStack(tempDir);
    expect(result.stack).toBe("python-fastapi");
    expect(result.detectedVia).toBe("pyproject.toml");
    expect(result.label).toBe("Python");
  });

  it("detects Python from requirements.txt", async () => {
    await writeFile(join(tempDir, "requirements.txt"), "fastapi\nuvicorn\n");
    const result = await detectStack(tempDir);
    expect(result.stack).toBe("python-fastapi");
    expect(result.detectedVia).toBe("requirements.txt");
    expect(result.label).toBe("Python");
  });

  it("prefers pyproject.toml over requirements.txt", async () => {
    await writeFile(join(tempDir, "pyproject.toml"), "[project]");
    await writeFile(join(tempDir, "requirements.txt"), "fastapi\n");
    const result = await detectStack(tempDir);
    expect(result.detectedVia).toBe("pyproject.toml");
  });

  // -----------------------------------------------------------------------
  // Flutter
  // -----------------------------------------------------------------------

  it("detects Flutter from pubspec.yaml", async () => {
    await writeFile(join(tempDir, "pubspec.yaml"), "name: my_app\n");
    const result = await detectStack(tempDir);
    expect(result.stack).toBe("flutter");
    expect(result.detectedVia).toBe("pubspec.yaml");
    expect(result.label).toBe("Flutter");
  });

  // -----------------------------------------------------------------------
  // Rust (no preset -- custom)
  // -----------------------------------------------------------------------

  it("detects Rust from Cargo.toml but returns custom stack", async () => {
    await writeFile(join(tempDir, "Cargo.toml"), '[package]\nname = "app"');
    const result = await detectStack(tempDir);
    expect(result.stack).toBe("custom");
    expect(result.detectedVia).toBe("Cargo.toml");
    expect(result.label).toBe("Rust");
  });

  // -----------------------------------------------------------------------
  // Priority: package.json > go.mod > Python > Flutter > Rust
  // -----------------------------------------------------------------------

  it("prefers package.json over go.mod", async () => {
    await writeFile(
      join(tempDir, "package.json"),
      JSON.stringify({ name: "app" }),
    );
    await writeFile(join(tempDir, "go.mod"), "module app");
    const result = await detectStack(tempDir);
    expect(result.detectedVia).toBe("package.json");
  });

  it("prefers go.mod over pyproject.toml", async () => {
    await writeFile(join(tempDir, "go.mod"), "module app");
    await writeFile(join(tempDir, "pyproject.toml"), "[project]");
    const result = await detectStack(tempDir);
    expect(result.detectedVia).toBe("go.mod");
  });

  // -----------------------------------------------------------------------
  // Malformed package.json
  // -----------------------------------------------------------------------

  it("falls through on malformed package.json", async () => {
    await writeFile(join(tempDir, "package.json"), "not valid json{{{");
    const result = await detectStack(tempDir);
    // Falls through to no-manifest fallback
    expect(result.stack).toBe("custom");
    expect(result.detectedVia).toBe("none");
  });

  it("falls through on malformed package.json to next manifest", async () => {
    await writeFile(join(tempDir, "package.json"), "broken");
    await writeFile(join(tempDir, "go.mod"), "module app");
    const result = await detectStack(tempDir);
    expect(result.stack).toBe("go");
    expect(result.detectedVia).toBe("go.mod");
  });
});
