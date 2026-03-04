import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  replaceTokens,
  buildTokenMap,
  renderTemplates,
} from "../../src/cli/renderer.js";
import type { ProjectBrief } from "../../src/cli/types.js";

describe("replaceTokens", () => {
  it("replaces a known token with its value", () => {
    const result = replaceTokens("Hello {{NAME}}", { NAME: "World" });
    expect(result).toBe("Hello World");
  });

  it("leaves an unknown token untouched", () => {
    const result = replaceTokens("Hello {{UNKNOWN}}", { NAME: "World" });
    expect(result).toBe("Hello {{UNKNOWN}}");
  });

  it("replaces multiple tokens in one string", () => {
    const result = replaceTokens("{{GREETING}} {{NAME}}!", {
      GREETING: "Hello",
      NAME: "World",
    });
    expect(result).toBe("Hello World!");
  });

  it("returns content unchanged when token map is empty", () => {
    const result = replaceTokens("Hello {{NAME}}", {});
    expect(result).toBe("Hello {{NAME}}");
  });

  it("replaces a token at the start of a line", () => {
    const result = replaceTokens("{{PREFIX}} rest of line", {
      PREFIX: "Start",
    });
    expect(result).toBe("Start rest of line");
  });

  it("replaces a token at the end of a line", () => {
    const result = replaceTokens("beginning {{SUFFIX}}", {
      SUFFIX: "End",
    });
    expect(result).toBe("beginning End");
  });

  it("handles content with no tokens at all", () => {
    const result = replaceTokens("plain text", { NAME: "World" });
    expect(result).toBe("plain text");
  });

  it("replaces the same token appearing multiple times", () => {
    const result = replaceTokens("{{X}} and {{X}}", { X: "same" });
    expect(result).toBe("same and same");
  });
});

function createBrief(overrides: Partial<ProjectBrief> = {}): ProjectBrief {
  return {
    projectName: "test-project",
    description: "A test project",
    targetUsers: "Developers",
    techStack: "nextjs-supabase",
    customStack: undefined,
    problemStatement: "Test problem",
    successCriteria: "Test criteria",
    valueProposition: "Test value prop",
    outOfScope: "Nothing",
    codeConventions: "TypeScript strict",
    outputDirectory: "./test-output",
    ...overrides,
  };
}

describe("buildTokenMap", () => {
  it("maps all brief fields to the correct tokens", () => {
    const brief = createBrief();
    const tokens = buildTokenMap(brief);

    expect(tokens.PROJECT_NAME).toBe("test-project");
    expect(tokens.PRODUCT_VISION).toBe("A test project");
    expect(tokens.TARGET_USERS).toBe("Developers");
    expect(tokens.PROBLEM_STATEMENT).toBe("Test problem");
    expect(tokens.SUCCESS_CRITERIA).toBe("Test criteria");
    expect(tokens.VALUE_PROPOSITION).toBe("Test value prop");
    expect(tokens.OUT_OF_SCOPE).toBe("Nothing");
    expect(tokens.CODE_CONVENTIONS).toBe("TypeScript strict");
  });

  it("uses stack description for preset stacks", () => {
    const brief = createBrief({ techStack: "nextjs-supabase" });
    const tokens = buildTokenMap(brief);

    expect(tokens.TECH_STACK).toContain("Next.js");
    expect(tokens.TECH_STACK).toContain("Supabase");
  });

  it("uses custom stack text when techStack is custom", () => {
    const brief = createBrief({
      techStack: "custom",
      customStack: "Django + PostgreSQL",
    });
    const tokens = buildTokenMap(brief);

    expect(tokens.TECH_STACK).toContain("Custom Stack");
    expect(tokens.TECH_STACK).toContain("Django + PostgreSQL");
  });

  it("uses fallback when custom stack text is undefined", () => {
    const brief = createBrief({
      techStack: "custom",
      customStack: undefined,
    });
    const tokens = buildTokenMap(brief);

    expect(tokens.TECH_STACK).toContain("Custom Stack");
    expect(tokens.TECH_STACK).toContain("details to be defined");
  });

  it("maps react-native stack to a description with React Native", () => {
    const brief = createBrief({ techStack: "react-native" });
    const tokens = buildTokenMap(brief);

    expect(tokens.TECH_STACK).toContain("React Native");
  });

  it("maps nodejs-cli stack to a description with Node.js", () => {
    const brief = createBrief({ techStack: "nodejs-cli" });
    const tokens = buildTokenMap(brief);

    expect(tokens.TECH_STACK).toContain("Node.js");
  });
});

describe("renderTemplates", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = join(tmpdir(), `lom-test-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("renders tokens in template files", async () => {
    await writeFile(
      join(tempDir, "readme.md"),
      "# {{PROJECT_NAME}}\n\n{{PRODUCT_VISION}}",
      "utf-8",
    );

    const rendered = await renderTemplates(tempDir, {
      PROJECT_NAME: "my-app",
      PRODUCT_VISION: "An awesome app",
    });

    expect(rendered).toHaveLength(1);
    expect(rendered[0].relativePath).toBe("readme.md");
    expect(rendered[0].content).toBe("# my-app\n\nAn awesome app");
  });

  it("preserves directory structure in relative paths", async () => {
    const subDir = join(tempDir, "sub", "deep");
    await mkdir(subDir, { recursive: true });
    await writeFile(join(subDir, "file.txt"), "content", "utf-8");

    const rendered = await renderTemplates(tempDir, {});

    expect(rendered).toHaveLength(1);
    expect(rendered[0].relativePath).toBe(join("sub", "deep", "file.txt"));
  });

  it("renders multiple files across directories", async () => {
    await writeFile(join(tempDir, "root.txt"), "{{A}}", "utf-8");
    const nested = join(tempDir, "nested");
    await mkdir(nested, { recursive: true });
    await writeFile(join(nested, "child.txt"), "{{B}}", "utf-8");

    const rendered = await renderTemplates(tempDir, { A: "alpha", B: "beta" });

    expect(rendered).toHaveLength(2);

    const rootFile = rendered.find((f) => f.relativePath === "root.txt");
    const childFile = rendered.find(
      (f) => f.relativePath === join("nested", "child.txt"),
    );

    expect(rootFile).toBeDefined();
    expect(rootFile?.content).toBe("alpha");
    expect(childFile).toBeDefined();
    expect(childFile?.content).toBe("beta");
  });

  it("leaves unknown tokens untouched in rendered files", async () => {
    await writeFile(
      join(tempDir, "test.md"),
      "{{KNOWN}} and {{UNKNOWN}}",
      "utf-8",
    );

    const rendered = await renderTemplates(tempDir, { KNOWN: "replaced" });

    expect(rendered[0].content).toBe("replaced and {{UNKNOWN}}");
  });

  it("renames 'gitignore' to '.gitignore' in output path", async () => {
    await writeFile(
      join(tempDir, "gitignore"),
      "node_modules/\ndist/",
      "utf-8",
    );

    const rendered = await renderTemplates(tempDir, {});

    expect(rendered).toHaveLength(1);
    expect(rendered[0].relativePath).toBe(".gitignore");
    expect(rendered[0].content).toBe("node_modules/\ndist/");
  });

  it("renames nested 'gitignore' files to '.gitignore'", async () => {
    const subDir = join(tempDir, "subdir");
    await mkdir(subDir, { recursive: true });
    await writeFile(join(subDir, "gitignore"), "*.log", "utf-8");

    const rendered = await renderTemplates(tempDir, {});

    expect(rendered).toHaveLength(1);
    expect(rendered[0].relativePath).toBe(join("subdir", ".gitignore"));
  });
});
