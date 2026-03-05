import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Mock @clack/prompts to control interactive input.
 */
vi.mock("@clack/prompts", () => ({
  text: vi.fn(),
  select: vi.fn(),
  confirm: vi.fn(),
  isCancel: vi.fn(() => false),
  cancel: vi.fn(),
  spinner: vi.fn(() => ({ start: vi.fn(), stop: vi.fn(), message: vi.fn() })),
  log: {
    info: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
  },
  note: vi.fn(),
  intro: vi.fn(),
  outro: vi.fn(),
}));

import * as p from "@clack/prompts";
import { collectProjectBrief, collectDeepContent } from "../../src/cli/prompts.js";

const mockedText = vi.mocked(p.text);
const mockedSelect = vi.mocked(p.select);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("collectDeepContent", () => {
  it("collects all 5 deep content fields", async () => {
    mockedText
      .mockResolvedValueOnce("Users need faster deploys")
      .mockResolvedValueOnce("Deploy time under 2 minutes")
      .mockResolvedValueOnce("The fastest deploy pipeline")
      .mockResolvedValueOnce("Multi-cloud, k8s")
      .mockResolvedValueOnce("ESLint, Prettier, strict TS");

    const result = await collectDeepContent();

    expect(result.problemStatement).toBe("Users need faster deploys");
    expect(result.successCriteria).toBe("Deploy time under 2 minutes");
    expect(result.valueProposition).toBe("The fastest deploy pipeline");
    expect(result.outOfScope).toBe("Multi-cloud, k8s");
    expect(result.codeConventions).toBe("ESLint, Prettier, strict TS");
    expect(mockedText).toHaveBeenCalledTimes(5);
  });
});

describe("collectProjectBrief with useAI=false", () => {
  it("collects all 10 prompts in the static flow", async () => {
    // 5 basic prompts: name, desc, users, custom stack (if custom), output dir
    // + stack select + 5 deep content prompts
    mockedText
      .mockResolvedValueOnce("my-project")       // projectName
      .mockResolvedValueOnce("A cool project")    // description
      .mockResolvedValueOnce("Developers")        // targetUsers
      // stack select happens via p.select
      .mockResolvedValueOnce("Problem X")         // problemStatement
      .mockResolvedValueOnce("Metric Y")          // successCriteria
      .mockResolvedValueOnce("Value Z")           // valueProposition
      .mockResolvedValueOnce("Not doing W")       // outOfScope
      .mockResolvedValueOnce("Strict mode")       // codeConventions
      .mockResolvedValueOnce("./my-project");     // outputDirectory

    mockedSelect.mockResolvedValueOnce("nodejs-cli" as never);

    const brief = await collectProjectBrief({ useAI: false });

    expect(brief.projectName).toBe("my-project");
    expect(brief.problemStatement).toBe("Problem X");
    expect(brief.successCriteria).toBe("Metric Y");
    expect(brief.valueProposition).toBe("Value Z");
    expect(brief.outOfScope).toBe("Not doing W");
    expect(brief.codeConventions).toBe("Strict mode");
    // 3 basic text + 5 deep + 1 output = 9 text calls
    expect(mockedText).toHaveBeenCalledTimes(9);
    expect(mockedSelect).toHaveBeenCalledTimes(1);
  });
});

describe("collectProjectBrief with useAI=true", () => {
  it("skips deep content prompts, only collects 5 basic fields", async () => {
    mockedText
      .mockResolvedValueOnce("ai-project")        // projectName
      .mockResolvedValueOnce("AI-powered app")     // description
      .mockResolvedValueOnce("Everyone")           // targetUsers
      // stack select via p.select
      .mockResolvedValueOnce("./ai-project");      // outputDirectory

    mockedSelect.mockResolvedValueOnce("nextjs-supabase" as never);

    const brief = await collectProjectBrief({ useAI: true });

    expect(brief.projectName).toBe("ai-project");
    expect(brief.description).toBe("AI-powered app");
    // Deep fields should have defaults
    expect(brief.problemStatement).toBe("To be defined by @meto-pm");
    expect(brief.successCriteria).toBe("To be defined by @meto-pm");
    expect(brief.valueProposition).toBe("To be defined by @meto-pm");
    expect(brief.outOfScope).toBe("To be defined by @meto-pm");
    expect(brief.codeConventions).toBe(
      "TypeScript strict mode, no any types, no console.log in production code",
    );
    // 3 basic text + 1 output = 4 text calls (no deep content)
    expect(mockedText).toHaveBeenCalledTimes(4);
    expect(mockedSelect).toHaveBeenCalledTimes(1);
  });
});

describe("fallback recovery after AI failure", () => {
  it("deep content can be collected after brief to fill in defaults", async () => {
    // Simulate: brief collected with useAI=true (defaults for deep fields)
    mockedText
      .mockResolvedValueOnce("fallback-project")
      .mockResolvedValueOnce("A fallback test")
      .mockResolvedValueOnce("Testers")
      .mockResolvedValueOnce("./fallback-project");

    mockedSelect.mockResolvedValueOnce("nodejs-cli" as never);

    const brief = await collectProjectBrief({ useAI: true });
    expect(brief.problemStatement).toBe("To be defined by @meto-pm");

    // Now simulate AI failure -> collect deep content as recovery
    mockedText
      .mockResolvedValueOnce("Recovered problem")
      .mockResolvedValueOnce("Recovered criteria")
      .mockResolvedValueOnce("Recovered value")
      .mockResolvedValueOnce("Recovered scope")
      .mockResolvedValueOnce("Recovered conventions");

    const deep = await collectDeepContent();

    // Apply to brief (same pattern as index.ts catch block)
    brief.problemStatement = deep.problemStatement;
    brief.successCriteria = deep.successCriteria;
    brief.valueProposition = deep.valueProposition;
    brief.outOfScope = deep.outOfScope;
    brief.codeConventions = deep.codeConventions;

    expect(brief.problemStatement).toBe("Recovered problem");
    expect(brief.successCriteria).toBe("Recovered criteria");
    expect(brief.valueProposition).toBe("Recovered value");
    expect(brief.outOfScope).toBe("Recovered scope");
    expect(brief.codeConventions).toBe("Recovered conventions");
  });
});
