import { describe, it, expect } from "vitest";
import {
  parseAIOutput,
  validateAIContent,
  AIParseError,
} from "../../src/cli/ai-parser.js";
import type { AIGeneratedContent } from "../../src/cli/ai-parser.js";

/**
 * Builds a well-formed AI output string with all sections populated.
 */
function buildWellFormedOutput(): string {
  return [
    "---SECTION:PRODUCT_VISION---",
    "A comprehensive product vision that explains what we are building.",
    "---END:PRODUCT_VISION---",
    "",
    "---SECTION:PROBLEM_STATEMENT---",
    "The problem we solve is that users lack structure.",
    "---END:PROBLEM_STATEMENT---",
    "",
    "---SECTION:SUCCESS_CRITERIA---",
    "- Users can scaffold in under 5 minutes",
    "- All files are generated correctly",
    "---END:SUCCESS_CRITERIA---",
    "",
    "---SECTION:VALUE_PROPOSITION---",
    "Methodology-first project scaffolding.",
    "---END:VALUE_PROPOSITION---",
    "",
    "---SECTION:OUT_OF_SCOPE---",
    "- Mobile support",
    "- Multi-user features",
    "---END:OUT_OF_SCOPE---",
    "",
    "---SECTION:EPICS---",
    "## E1 -- Project Setup",
    "**Goal:** Initialize the project",
    "**Status:** Not started",
    "**Tasks:** To be sliced by @meto-pm",
    "",
    "---",
    "",
    "## E2 -- Core Feature",
    "**Goal:** Build the main feature",
    "**Status:** Not started",
    "**Tasks:** To be sliced by @meto-pm",
    "---END:EPICS---",
    "",
    "---SECTION:STARTER_TASKS---",
    '## [slice-001] -- Initialize project structure',
    "**Epic:** E1 | **Size:** S | **Depends on:** none",
    "",
    "**User Story**",
    "As a developer, I want a project structure so that I can start coding.",
    "",
    "**Acceptance Criteria**",
    "- [ ] Directory structure created",
    "- [ ] Package.json initialized",
    "- [ ] TypeScript configured",
    "",
    "**Out of Scope**",
    "CI/CD configuration",
    "---END:STARTER_TASKS---",
    "",
    "---SECTION:DEFINITION_OF_DONE---",
    "## Universal Checks",
    "- [ ] TypeScript compiles",
    "- [ ] No any types",
    "",
    "## Stack-Specific Checks",
    "- [ ] Build succeeds",
    "---END:DEFINITION_OF_DONE---",
  ].join("\n");
}

describe("parseAIOutput", () => {
  it("parses well-formed output into all fields", () => {
    const raw = buildWellFormedOutput();
    const result = parseAIOutput(raw);

    expect(result.productVision).toContain("comprehensive product vision");
    expect(result.problemStatement).toContain("users lack structure");
    expect(result.successCriteria).toContain("scaffold in under 5 minutes");
    expect(result.valueProposition).toContain("Methodology-first");
    expect(result.outOfScope).toContain("Mobile support");
    expect(result.epics).toContain("## E1 -- Project Setup");
    expect(result.starterTasks).toContain("## [slice-001]");
    expect(result.definitionOfDone).toContain("Universal Checks");
  });

  it("trims whitespace from extracted sections", () => {
    const raw = [
      "---SECTION:PRODUCT_VISION---",
      "",
      "  Trimmed vision  ",
      "",
      "---END:PRODUCT_VISION---",
    ].join("\n");
    const result = parseAIOutput(raw);
    expect(result.productVision).toBe("Trimmed vision");
  });

  it("uses fallback for missing sections", () => {
    const raw = [
      "---SECTION:PRODUCT_VISION---",
      "Just a vision",
      "---END:PRODUCT_VISION---",
    ].join("\n");
    const result = parseAIOutput(raw);

    expect(result.productVision).toBe("Just a vision");
    expect(result.problemStatement).toBe("To be defined by @meto-pm");
    expect(result.successCriteria).toBe("To be defined by @meto-pm");
    expect(result.epics).toBe("To be defined by @meto-pm");
  });

  it("uses fallback for empty sections", () => {
    const raw = [
      "---SECTION:PRODUCT_VISION---",
      "",
      "---END:PRODUCT_VISION---",
      "---SECTION:PROBLEM_STATEMENT---",
      "Real problem",
      "---END:PROBLEM_STATEMENT---",
    ].join("\n");
    const result = parseAIOutput(raw);

    expect(result.productVision).toBe("To be defined by @meto-pm");
    expect(result.problemStatement).toBe("Real problem");
  });

  it("throws AIParseError when no markers found at all", () => {
    const raw = "This is just random text with no markers whatsoever.";

    expect(() => parseAIOutput(raw)).toThrow(AIParseError);
  });

  it("attaches raw output to AIParseError", () => {
    const raw = "Unparseable garbage";

    try {
      parseAIOutput(raw);
      expect.fail("Should have thrown");
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(AIParseError);
      expect((err as AIParseError).rawOutput).toBe("Unparseable garbage");
    }
  });

  it("handles partial output with only some sections", () => {
    const raw = [
      "---SECTION:PRODUCT_VISION---",
      "Partial vision",
      "---END:PRODUCT_VISION---",
      "---SECTION:EPICS---",
      "## E1 -- Setup",
      "---END:EPICS---",
    ].join("\n");
    const result = parseAIOutput(raw);

    expect(result.productVision).toBe("Partial vision");
    expect(result.epics).toBe("## E1 -- Setup");
    expect(result.problemStatement).toBe("To be defined by @meto-pm");
    expect(result.starterTasks).toBe("To be defined by @meto-pm");
  });

  it("handles section with missing end marker gracefully", () => {
    const raw = [
      "---SECTION:PRODUCT_VISION---",
      "Vision without end",
      "---SECTION:PROBLEM_STATEMENT---",
      "Problem here",
      "---END:PROBLEM_STATEMENT---",
    ].join("\n");
    const result = parseAIOutput(raw);

    // PRODUCT_VISION has no END marker, so it falls back
    expect(result.productVision).toBe("To be defined by @meto-pm");
    expect(result.problemStatement).toBe("Problem here");
  });
});

describe("validateAIContent", () => {
  it("returns valid for well-formed content", () => {
    const content: AIGeneratedContent = {
      productVision: "A real vision",
      problemStatement: "A real problem",
      successCriteria: "- Criterion 1",
      valueProposition: "Real value",
      outOfScope: "- Nothing extra",
      epics: "## E1 -- Setup\n**Goal:** Do stuff",
      starterTasks: '## [slice-001] -- First task\n**Acceptance Criteria**\n- [ ] Done\n**Out of Scope**\nNothing',
      definitionOfDone: "## Universal Checks\n- [ ] Compiles",
    };

    const result = validateAIContent(content);
    expect(result.valid).toBe(true);
    expect(result.warnings).toHaveLength(0);
  });

  it("warns when a section uses fallback value", () => {
    const content: AIGeneratedContent = {
      productVision: "To be defined by @meto-pm",
      problemStatement: "A real problem",
      successCriteria: "- Criterion 1",
      valueProposition: "Real value",
      outOfScope: "- Nothing extra",
      epics: "## E1 -- Setup",
      starterTasks: '## [slice-001] -- Task\n**Acceptance Criteria**\n**Out of Scope**',
      definitionOfDone: "## Universal Checks",
    };

    const result = validateAIContent(content);
    expect(result.valid).toBe(false);
    expect(result.warnings).toContain("Product Vision section is missing or uses fallback value");
  });

  it("warns when epics section does not contain ## E1", () => {
    const content: AIGeneratedContent = {
      productVision: "Vision",
      problemStatement: "Problem",
      successCriteria: "Criteria",
      valueProposition: "Value",
      outOfScope: "Scope",
      epics: "Some epics without proper formatting",
      starterTasks: '## [slice-001] -- Task\n**Acceptance Criteria**\n**Out of Scope**',
      definitionOfDone: "DoD",
    };

    const result = validateAIContent(content);
    expect(result.valid).toBe(false);
    expect(result.warnings).toContain("Epics section does not contain at least ## E1");
  });

  it("warns when starter tasks section does not contain ## [slice-001]", () => {
    const content: AIGeneratedContent = {
      productVision: "Vision",
      problemStatement: "Problem",
      successCriteria: "Criteria",
      valueProposition: "Value",
      outOfScope: "Scope",
      epics: "## E1 -- Setup",
      starterTasks: "Some tasks without proper formatting",
      definitionOfDone: "DoD",
    };

    const result = validateAIContent(content);
    expect(result.valid).toBe(false);
    expect(result.warnings).toContain("Starter Tasks section does not contain at least ## [slice-001]");
  });

  it("warns when starter tasks are missing Acceptance Criteria", () => {
    const content: AIGeneratedContent = {
      productVision: "Vision",
      problemStatement: "Problem",
      successCriteria: "Criteria",
      valueProposition: "Value",
      outOfScope: "Scope",
      epics: "## E1 -- Setup",
      starterTasks: "## [slice-001] -- Task\n**Out of Scope**\nNothing",
      definitionOfDone: "DoD",
    };

    const result = validateAIContent(content);
    expect(result.valid).toBe(false);
    expect(result.warnings).toContain("Starter Tasks are missing Acceptance Criteria headings");
  });

  it("warns when starter tasks are missing Out of Scope", () => {
    const content: AIGeneratedContent = {
      productVision: "Vision",
      problemStatement: "Problem",
      successCriteria: "Criteria",
      valueProposition: "Value",
      outOfScope: "Scope",
      epics: "## E1 -- Setup",
      starterTasks: "## [slice-001] -- Task\n**Acceptance Criteria**\n- [ ] Done",
      definitionOfDone: "DoD",
    };

    const result = validateAIContent(content);
    expect(result.valid).toBe(false);
    expect(result.warnings).toContain("Starter Tasks are missing Out of Scope headings");
  });

  it("collects multiple warnings", () => {
    const content: AIGeneratedContent = {
      productVision: "To be defined by @meto-pm",
      problemStatement: "To be defined by @meto-pm",
      successCriteria: "Criteria",
      valueProposition: "Value",
      outOfScope: "Scope",
      epics: "No proper epics",
      starterTasks: "No proper tasks",
      definitionOfDone: "DoD",
    };

    const result = validateAIContent(content);
    expect(result.valid).toBe(false);
    expect(result.warnings.length).toBeGreaterThan(2);
  });
});
