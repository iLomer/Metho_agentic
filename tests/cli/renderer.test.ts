import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  replaceTokens,
  buildTokenMap,
  buildWorkflowAgentsSection,
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
    workflowMode: "sprint",
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

  it("maps DEFINITION_OF_DONE token for nextjs-supabase stack", () => {
    const brief = createBrief({ techStack: "nextjs-supabase" });
    const tokens = buildTokenMap(brief);

    expect(tokens.DEFINITION_OF_DONE).toContain("TypeScript compiles");
    expect(tokens.DEFINITION_OF_DONE).toContain("No `any` types");
    expect(tokens.DEFINITION_OF_DONE).toContain("No `console.log`");
    expect(tokens.DEFINITION_OF_DONE).toContain("Supabase migrations");
    expect(tokens.DEFINITION_OF_DONE).toContain("Responsive on mobile");
  });

  it("maps DEFINITION_OF_DONE token for react-native stack", () => {
    const brief = createBrief({ techStack: "react-native" });
    const tokens = buildTokenMap(brief);

    expect(tokens.DEFINITION_OF_DONE).toContain("iOS simulator");
    expect(tokens.DEFINITION_OF_DONE).toContain("No hardcoded dimensions");
    expect(tokens.DEFINITION_OF_DONE).toContain("Navigation works");
  });

  it("maps DEFINITION_OF_DONE token for nodejs-cli stack", () => {
    const brief = createBrief({ techStack: "nodejs-cli" });
    const tokens = buildTokenMap(brief);

    expect(tokens.DEFINITION_OF_DONE).toContain("Help text present");
    expect(tokens.DEFINITION_OF_DONE).toContain("Exit codes correct");
    expect(tokens.DEFINITION_OF_DONE).toContain("Unit tests pass");
  });

  it("maps DEFINITION_OF_DONE token for custom stack with universal checks", () => {
    const brief = createBrief({
      techStack: "custom",
      customStack: "Django + PostgreSQL",
    });
    const tokens = buildTokenMap(brief);

    expect(tokens.DEFINITION_OF_DONE).toContain("TypeScript compiles");
    expect(tokens.DEFINITION_OF_DONE).toContain("Add stack-specific checks here");
    expect(tokens.DEFINITION_OF_DONE).toContain("Django + PostgreSQL");
  });

  it("maps STARTER_EPICS token for nextjs-supabase stack", () => {
    const brief = createBrief({ techStack: "nextjs-supabase" });
    const tokens = buildTokenMap(brief);

    expect(tokens.STARTER_EPICS).toContain("test-project");
    expect(tokens.STARTER_EPICS).toContain("E1 -- Project Setup");
    expect(tokens.STARTER_EPICS).toContain("Next.js");
    expect(tokens.STARTER_EPICS).toContain("Tailwind");
    expect(tokens.STARTER_EPICS).toContain("Supabase");
    expect(tokens.STARTER_EPICS).toContain("E2 -- Auth");
    expect(tokens.STARTER_EPICS).toContain("sign up");
    expect(tokens.STARTER_EPICS).toContain("E3 -- Core Feature");
    expect(tokens.STARTER_EPICS).toContain("E4 -- Deploy");
    expect(tokens.STARTER_EPICS).toContain("Vercel");
    expect(tokens.STARTER_EPICS).toContain("Not started");
    expect(tokens.STARTER_EPICS).toContain("To be sliced by @meto-pm");
  });

  it("maps STARTER_EPICS token for react-native stack", () => {
    const brief = createBrief({ techStack: "react-native" });
    const tokens = buildTokenMap(brief);

    expect(tokens.STARTER_EPICS).toContain("test-project");
    expect(tokens.STARTER_EPICS).toContain("E1 -- Project Setup");
    expect(tokens.STARTER_EPICS).toContain("Expo");
    expect(tokens.STARTER_EPICS).toContain("React Navigation");
    expect(tokens.STARTER_EPICS).toContain("E2 -- Auth");
    expect(tokens.STARTER_EPICS).toContain("E3 -- Core Feature");
    expect(tokens.STARTER_EPICS).toContain("E4 -- App Store Prep");
    expect(tokens.STARTER_EPICS).toContain("Not started");
    expect(tokens.STARTER_EPICS).toContain("To be sliced by @meto-pm");
  });

  it("maps STARTER_EPICS token for nodejs-cli stack", () => {
    const brief = createBrief({ techStack: "nodejs-cli" });
    const tokens = buildTokenMap(brief);

    expect(tokens.STARTER_EPICS).toContain("test-project");
    expect(tokens.STARTER_EPICS).toContain("E1 -- CLI Scaffold");
    expect(tokens.STARTER_EPICS).toContain("entry point");
    expect(tokens.STARTER_EPICS).toContain("help");
    expect(tokens.STARTER_EPICS).toContain("version");
    expect(tokens.STARTER_EPICS).toContain("E2 -- Core Command");
    expect(tokens.STARTER_EPICS).toContain("E3 -- Testing + CI");
    expect(tokens.STARTER_EPICS).toContain("E4 -- npm Publish");
    expect(tokens.STARTER_EPICS).toContain("Not started");
    expect(tokens.STARTER_EPICS).toContain("To be sliced by @meto-pm");
  });

  it("maps WORKFLOW_AGENTS_SECTION token for sprint mode", () => {
    const brief = createBrief({ workflowMode: "sprint" });
    const tokens = buildTokenMap(brief);

    expect(tokens.WORKFLOW_AGENTS_SECTION).toContain("@meto-pm");
    expect(tokens.WORKFLOW_AGENTS_SECTION).toContain("@meto-developer");
    expect(tokens.WORKFLOW_AGENTS_SECTION.toLowerCase()).not.toContain("swarm");
  });

  it("maps WORKFLOW_AGENTS_SECTION token for swarm mode", () => {
    const brief = createBrief({ workflowMode: "swarm" });
    const tokens = buildTokenMap(brief);

    expect(tokens.WORKFLOW_AGENTS_SECTION).toContain("@meto-pm");
    expect(tokens.WORKFLOW_AGENTS_SECTION).toContain("@meto-epic-[id]");
    expect(tokens.WORKFLOW_AGENTS_SECTION).toContain("domain-map");
    expect(tokens.WORKFLOW_AGENTS_SECTION).toContain("meto-cli status");
  });

  it("maps STARTER_EPICS token for custom stack with generic epics", () => {
    const brief = createBrief({
      techStack: "custom",
      customStack: "Django + PostgreSQL",
    });
    const tokens = buildTokenMap(brief);

    expect(tokens.STARTER_EPICS).toContain("test-project");
    expect(tokens.STARTER_EPICS).toContain("E1 -- Project Setup");
    expect(tokens.STARTER_EPICS).toContain("E2 -- Core Feature");
    expect(tokens.STARTER_EPICS).toContain("E3 -- Testing");
    expect(tokens.STARTER_EPICS).toContain("E4 -- Deploy");
    expect(tokens.STARTER_EPICS).toContain("Not started");
    expect(tokens.STARTER_EPICS).toContain("To be sliced by @meto-pm");
    expect(tokens.STARTER_EPICS).toContain("Django + PostgreSQL");
  });
});

describe("renderTemplates", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = join(tmpdir(), `meto-test-${Date.now()}`);
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

  it("excludes swarm files when workflow mode is sprint", async () => {
    const swarmDir = join(tempDir, "ai", "swarm");
    const workflowDir = join(tempDir, "ai", "workflows");
    await mkdir(swarmDir, { recursive: true });
    await mkdir(workflowDir, { recursive: true });
    await writeFile(join(tempDir, "CLAUDE.md"), "# Project", "utf-8");
    await writeFile(join(swarmDir, "SWARM_AWARENESS.md"), "swarm", "utf-8");
    await writeFile(join(swarmDir, "domain-map.md"), "domains", "utf-8");
    await writeFile(join(workflowDir, "swarm-workflow.md"), "workflow", "utf-8");
    await writeFile(join(workflowDir, "commit-conventions.md"), "commits", "utf-8");

    const rendered = await renderTemplates(tempDir, {}, "sprint");

    const paths = rendered.map((f) => f.relativePath.replace(/\\/g, "/"));
    expect(paths).toContain("CLAUDE.md");
    expect(paths).toContain("ai/workflows/commit-conventions.md");
    expect(paths).not.toContain("ai/swarm/SWARM_AWARENESS.md");
    expect(paths).not.toContain("ai/swarm/domain-map.md");
    expect(paths).not.toContain("ai/workflows/swarm-workflow.md");
  });

  it("includes swarm files when workflow mode is swarm", async () => {
    const swarmDir = join(tempDir, "ai", "swarm");
    const workflowDir = join(tempDir, "ai", "workflows");
    await mkdir(swarmDir, { recursive: true });
    await mkdir(workflowDir, { recursive: true });
    await writeFile(join(tempDir, "CLAUDE.md"), "# Project", "utf-8");
    await writeFile(join(swarmDir, "SWARM_AWARENESS.md"), "swarm", "utf-8");
    await writeFile(join(swarmDir, "domain-map.md"), "domains", "utf-8");
    await writeFile(join(workflowDir, "swarm-workflow.md"), "workflow", "utf-8");

    const rendered = await renderTemplates(tempDir, {}, "swarm");

    const paths = rendered.map((f) => f.relativePath.replace(/\\/g, "/"));
    expect(paths).toContain("CLAUDE.md");
    expect(paths).toContain("ai/swarm/SWARM_AWARENESS.md");
    expect(paths).toContain("ai/swarm/domain-map.md");
    expect(paths).toContain("ai/workflows/swarm-workflow.md");
  });

  it("excludes epic-agent.md base template in both modes", async () => {
    const agentsDir = join(tempDir, ".claude", "agents");
    await mkdir(agentsDir, { recursive: true });
    await writeFile(join(agentsDir, "epic-agent.md"), "template", "utf-8");
    await writeFile(join(agentsDir, "developer-agent.md"), "dev", "utf-8");

    const renderedSprint = await renderTemplates(tempDir, {}, "sprint");
    const pathsSprint = renderedSprint.map((f) => f.relativePath.replace(/\\/g, "/"));
    expect(pathsSprint).not.toContain(".claude/agents/epic-agent.md");
    expect(pathsSprint).toContain(".claude/agents/developer-agent.md");

    const renderedSwarm = await renderTemplates(tempDir, {}, "swarm");
    const pathsSwarm = renderedSwarm.map((f) => f.relativePath.replace(/\\/g, "/"));
    expect(pathsSwarm).not.toContain(".claude/agents/epic-agent.md");
    expect(pathsSwarm).toContain(".claude/agents/developer-agent.md");
  });
});

describe("buildWorkflowAgentsSection", () => {
  it("sprint mode does not contain swarm references", () => {
    const section = buildWorkflowAgentsSection("sprint");

    expect(section).toContain("@meto-pm");
    expect(section).toContain("@meto-developer");
    expect(section).toContain("@meto-tester");
    expect(section.toLowerCase()).not.toContain("swarm");
    expect(section).not.toContain("domain-map");
    expect(section).not.toContain("meto-cli status");
  });

  it("swarm mode contains both agent tables and swarm references", () => {
    const section = buildWorkflowAgentsSection("swarm");

    // Sprint agents still present
    expect(section).toContain("@meto-pm");
    expect(section).toContain("@meto-developer");
    expect(section).toContain("@meto-tester");

    // Swarm agent table
    expect(section).toContain("@meto-epic-[id]");

    // Swarm references
    expect(section).toContain("ai/swarm/domain-map.md");
    expect(section).toContain("ai/workflows/swarm-workflow.md");
    expect(section).toContain("npx meto-cli status");
  });
});
