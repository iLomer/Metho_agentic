import { describe, it, expect } from "vitest";
import { parseTaskDependencies } from "../../../src/cli/board/parser.js";

const TASK_WITH_BOTH_FIELDS = `## [slice-094] -- SessionStart: require handoff read
**Epic:** E25 | **Size:** XS | **Depends on:** slice-092, slice-093
**Needs:** slice-092, slice-093
**Blocks:** slice-095

**User Story**
As a developer agent starting a session, I want the CLAUDE.md to require reading the handoff file first.
`;

const TASK_WITH_NEITHER_FIELD = `## [slice-085] -- Sprint contract template
**Epic:** E23 | **Size:** S | **Depends on:** none

**User Story**
As a developer, I want a sprint contract template.
`;

const TASK_WITH_NEEDS_NONE = `## [slice-086] -- CLAUDE.md template update
**Epic:** E23 | **Size:** XS | **Depends on:** none
**Needs:** none
**Blocks:** none

**User Story**
As a developer, I want the CLAUDE.md to enforce the contract step.
`;

const TASK_WITH_MULTI_NEEDS = `## [slice-110] -- meto ready output formatting
**Epic:** E28 | **Size:** S | **Depends on:** slice-108, slice-109
**Needs:** slice-101, slice-102, slice-103
**Blocks:** slice-111

**User Story**
As a developer, I want readable output from meto ready.
`;

const TASK_WITH_SINGLE_NEEDS = `## [slice-107] -- parseTaskDependencies parser
**Epic:** E28 | **Size:** S | **Depends on:** slice-106
**Needs:** slice-106
**Blocks:** slice-108, slice-109

**User Story**
As the meto ready command, I want a parser for task dependencies.
`;

describe("parseTaskDependencies", () => {
  describe("sliceId extraction", () => {
    it("extracts sliceId from ## [slice-NNN] heading", () => {
      const result = parseTaskDependencies(TASK_WITH_BOTH_FIELDS);
      expect(result.sliceId).toBe("slice-094");
    });

    it("extracts sliceId from a different slice number", () => {
      const result = parseTaskDependencies(TASK_WITH_MULTI_NEEDS);
      expect(result.sliceId).toBe("slice-110");
    });

    it("extracts sliceId when Needs and Blocks are absent", () => {
      const result = parseTaskDependencies(TASK_WITH_NEITHER_FIELD);
      expect(result.sliceId).toBe("slice-085");
    });
  });

  describe("needs extraction", () => {
    it("parses multiple needs entries, trimming whitespace", () => {
      const result = parseTaskDependencies(TASK_WITH_BOTH_FIELDS);
      expect(result.needs).toEqual(["slice-092", "slice-093"]);
    });

    it("parses a single needs entry", () => {
      const result = parseTaskDependencies(TASK_WITH_SINGLE_NEEDS);
      expect(result.needs).toEqual(["slice-106"]);
    });

    it("parses three needs entries", () => {
      const result = parseTaskDependencies(TASK_WITH_MULTI_NEEDS);
      expect(result.needs).toEqual(["slice-101", "slice-102", "slice-103"]);
    });

    it("returns empty array when Needs field is absent", () => {
      const result = parseTaskDependencies(TASK_WITH_NEITHER_FIELD);
      expect(result.needs).toEqual([]);
    });

    it("returns empty array when Needs value is 'none'", () => {
      const result = parseTaskDependencies(TASK_WITH_NEEDS_NONE);
      expect(result.needs).toEqual([]);
    });

    it("is case-insensitive for the Needs label", () => {
      const block = `## [slice-200] -- Case test\n**needs:** slice-010\n`;
      const result = parseTaskDependencies(block);
      expect(result.needs).toEqual(["slice-010"]);
    });

    it("trims leading and trailing whitespace from each needs entry", () => {
      const block = `## [slice-201] -- Whitespace test\n**Needs:** slice-010 ,  slice-011 , slice-012\n`;
      const result = parseTaskDependencies(block);
      expect(result.needs).toEqual(["slice-010", "slice-011", "slice-012"]);
    });
  });

  describe("blocks extraction", () => {
    it("parses a single blocks entry", () => {
      const result = parseTaskDependencies(TASK_WITH_BOTH_FIELDS);
      expect(result.blocks).toEqual(["slice-095"]);
    });

    it("parses multiple blocks entries", () => {
      const result = parseTaskDependencies(TASK_WITH_SINGLE_NEEDS);
      expect(result.blocks).toEqual(["slice-108", "slice-109"]);
    });

    it("returns empty array when Blocks field is absent", () => {
      const result = parseTaskDependencies(TASK_WITH_NEITHER_FIELD);
      expect(result.blocks).toEqual([]);
    });

    it("returns empty array when Blocks value is 'none'", () => {
      const result = parseTaskDependencies(TASK_WITH_NEEDS_NONE);
      expect(result.blocks).toEqual([]);
    });

    it("is case-insensitive for the Blocks label", () => {
      const block = `## [slice-202] -- Case test\n**blocks:** slice-020\n`;
      const result = parseTaskDependencies(block);
      expect(result.blocks).toEqual(["slice-020"]);
    });

    it("trims leading and trailing whitespace from each blocks entry", () => {
      const block = `## [slice-203] -- Whitespace test\n**Blocks:**  slice-020 , slice-021\n`;
      const result = parseTaskDependencies(block);
      expect(result.blocks).toEqual(["slice-020", "slice-021"]);
    });
  });

  describe("task with neither field", () => {
    it("returns empty needs and blocks when both fields are absent", () => {
      const result = parseTaskDependencies(TASK_WITH_NEITHER_FIELD);
      expect(result.needs).toEqual([]);
      expect(result.blocks).toEqual([]);
    });

    it("still extracts the sliceId when dependency fields are absent", () => {
      const result = parseTaskDependencies(TASK_WITH_NEITHER_FIELD);
      expect(result.sliceId).toBe("slice-085");
    });
  });

  describe("slice-110 fixture scenarios", () => {
    it("returns ['slice-101', 'slice-102'] for Needs: slice-101, slice-102", () => {
      const block = `## [slice-304] -- Task needing two deps\n**Epic:** E30 | **Size:** S | **Depends on:** slice-101, slice-102\n**Needs:** slice-101, slice-102\n\n**User Story**\nAs a developer, I want a task with two dependencies.\n`;
      const result = parseTaskDependencies(block);
      expect(result.needs).toEqual(["slice-101", "slice-102"]);
    });

    it("returns [] for Needs: none", () => {
      const block = `## [slice-305] -- Task with explicit none\n**Epic:** E30 | **Size:** XS | **Depends on:** none\n**Needs:** none\n\n**User Story**\nAs a developer, I want a task that explicitly declares no needs.\n`;
      const result = parseTaskDependencies(block);
      expect(result.needs).toEqual([]);
    });

    it("returns [] when no Needs line is present", () => {
      const block = `## [slice-306] -- Task with no Needs field\n**Epic:** E30 | **Size:** XS | **Depends on:** none\n\n**User Story**\nAs a developer, I want a task that omits the Needs field entirely.\n`;
      const result = parseTaskDependencies(block);
      expect(result.needs).toEqual([]);
    });
  });
});
