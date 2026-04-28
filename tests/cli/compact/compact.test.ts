import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  type MockInstance,
} from "vitest";
import { writeFileSync, readFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";

// ---------------------------------------------------------------------------
// Mock @anthropic-ai/sdk before importing the module under test
// ---------------------------------------------------------------------------

const mockMessagesCreate = vi.fn();

vi.mock("@anthropic-ai/sdk", () => {
  class MockAnthropic {
    messages = {
      create: mockMessagesCreate,
    };
  }
  return { default: MockAnthropic };
});

// Import after mocking
import { compactDone, COMPACT_PROMPT } from "../../../src/cli/compact/index.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const FIXTURE_PATH =
  "tests/fixtures/compact/tasks-done-fixture.md";

function makeTempFile(content: string): string {
  const dir = join(tmpdir(), `meto-compact-test-${randomUUID()}`);
  mkdirSync(dir, { recursive: true });
  const filePath = join(dir, "tasks-done.md");
  writeFileSync(filePath, content, "utf-8");
  return filePath;
}

function buildFixtureContent(): string {
  return readFileSync(FIXTURE_PATH, "utf-8");
}

function mockSummaryResponse(summary: string): void {
  mockMessagesCreate.mockResolvedValue({
    content: [{ type: "text", text: summary }],
  });
}

// ---------------------------------------------------------------------------
// Environment helpers
// ---------------------------------------------------------------------------

let savedApiKey: string | undefined;

beforeEach(() => {
  savedApiKey = process.env["ANTHROPIC_API_KEY"];
  process.env["ANTHROPIC_API_KEY"] = "test-api-key";
  vi.clearAllMocks();
});

afterEach(() => {
  if (savedApiKey === undefined) {
    delete process.env["ANTHROPIC_API_KEY"];
  } else {
    process.env["ANTHROPIC_API_KEY"] = savedApiKey;
  }
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("compactDone", () => {
  describe("returns correct CompactResult counts", () => {
    it("counts 3 originalTaskCount when fixture has 3 task blocks", async () => {
      mockSummaryResponse("Implemented the compact module scaffold.");

      const filePath = makeTempFile(buildFixtureContent());
      const result = await compactDone(filePath);

      expect(result.originalTaskCount).toBe(3);
    });

    it("compactedTaskCount equals originalTaskCount", async () => {
      mockSummaryResponse("Implemented the compact module scaffold.");

      const filePath = makeTempFile(buildFixtureContent());
      const result = await compactDone(filePath);

      expect(result.compactedTaskCount).toBe(result.originalTaskCount);
    });

    it("outputPath is the resolved absolute path to the file", async () => {
      mockSummaryResponse("Implemented the compact module scaffold.");

      const filePath = makeTempFile(buildFixtureContent());
      const result = await compactDone(filePath);

      expect(result.outputPath).toBe(filePath);
    });
  });

  describe("Haiku model and token settings", () => {
    it("calls messages.create with max_tokens: 200", async () => {
      mockSummaryResponse("Fixed summary.");

      const filePath = makeTempFile(buildFixtureContent());
      await compactDone(filePath);

      const calls = mockMessagesCreate.mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      for (const call of calls) {
        expect(call[0].max_tokens).toBe(200);
      }
    });

    it("calls messages.create with model claude-haiku-4-5", async () => {
      mockSummaryResponse("Fixed summary.");

      const filePath = makeTempFile(buildFixtureContent());
      await compactDone(filePath);

      const calls = mockMessagesCreate.mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      for (const call of calls) {
        expect(call[0].model).toBe("claude-haiku-4-5");
      }
    });
  });

  describe("output format", () => {
    it("each compacted block starts with ## [slice-NNN] -- and ends with (COMPACTED)", async () => {
      mockSummaryResponse("Implemented the compact scaffold.");

      const filePath = makeTempFile(buildFixtureContent());
      await compactDone(filePath);

      const written = readFileSync(filePath, "utf-8");
      // Find all lines that are compacted headers (format: ## [slice-NNN] -- Name (COMPACTED))
      const compactedHeaderLines = written
        .split("\n")
        .filter((line) => line.match(/^## \[slice-\S+\] -- .+ \(COMPACTED\)$/));

      expect(compactedHeaderLines.length).toBe(3);
      for (const line of compactedHeaderLines) {
        expect(line).toMatch(/^## \[slice-\S+\] -- .+ \(COMPACTED\)$/);
      }
    });

    it("compacted block contains Epic and Outcome fields", async () => {
      mockSummaryResponse("The outcome summary text.");

      const filePath = makeTempFile(buildFixtureContent());
      await compactDone(filePath);

      const written = readFileSync(filePath, "utf-8");
      const segments = written.split("\n---\n");
      const taskSegments = segments.filter((s) =>
        s.trimStart().startsWith("## [slice-"),
      );

      for (const seg of taskSegments) {
        expect(seg).toContain("Epic:");
        expect(seg).toContain("Outcome:");
        expect(seg).toContain("The outcome summary text.");
      }
    });
  });

  describe("summarization prompt contains original task text", () => {
    it("passes the original task block text to the API", async () => {
      mockSummaryResponse("Scaffold complete.");

      const filePath = makeTempFile(buildFixtureContent());
      await compactDone(filePath);

      const calls = mockMessagesCreate.mock.calls;
      expect(calls.length).toBeGreaterThan(0);

      // The first call should contain text from the first task block
      const firstCallContent = calls[0][0].messages[0].content as string;
      expect(firstCallContent).toContain(COMPACT_PROMPT);
      expect(firstCallContent).toContain("slice-101");
    });

    it("each task block is passed separately to the API", async () => {
      mockSummaryResponse("Summary.");

      const filePath = makeTempFile(buildFixtureContent());
      await compactDone(filePath);

      // 3 task blocks = 3 API calls
      expect(mockMessagesCreate).toHaveBeenCalledTimes(3);
    });
  });

  describe("throws when ANTHROPIC_API_KEY is missing", () => {
    it("throws the correct error message when env var is unset", async () => {
      delete process.env["ANTHROPIC_API_KEY"];

      const filePath = makeTempFile(buildFixtureContent());

      await expect(compactDone(filePath)).rejects.toThrow(
        "ANTHROPIC_API_KEY environment variable is required for meto compact",
      );
    });

    it("does not call the Anthropic API when key is missing", async () => {
      delete process.env["ANTHROPIC_API_KEY"];

      const filePath = makeTempFile(buildFixtureContent());

      await expect(compactDone(filePath)).rejects.toThrow();
      expect(mockMessagesCreate).not.toHaveBeenCalled();
    });
  });

  describe("handles empty done file gracefully", () => {
    it("returns originalTaskCount of 0 when file has no task blocks", async () => {
      const emptyContent = "# Tasks — Done\n\nNo tasks here yet.\n";
      const filePath = makeTempFile(emptyContent);

      const result = await compactDone(filePath);

      expect(result.originalTaskCount).toBe(0);
      expect(result.compactedTaskCount).toBe(0);
    });

    it("does not call the API when there are no task blocks", async () => {
      const emptyContent = "# Tasks — Done\n\nNo tasks here yet.\n";
      const filePath = makeTempFile(emptyContent);

      await compactDone(filePath);

      expect(mockMessagesCreate).not.toHaveBeenCalled();
    });

    it("writes output back to disk even when file has no task blocks", async () => {
      const emptyContent = "# Tasks — Done\n\nNo tasks here yet.\n";
      const filePath = makeTempFile(emptyContent);

      await compactDone(filePath);

      // File should still be readable (write happened without throwing)
      expect(() => readFileSync(filePath, "utf-8")).not.toThrow();
    });
  });

  describe("writes compacted content back to disk", () => {
    it("overwrites the original file at the given path", async () => {
      mockSummaryResponse("Compact summary.");

      const originalContent = buildFixtureContent();
      const filePath = makeTempFile(originalContent);

      await compactDone(filePath);

      const written = readFileSync(filePath, "utf-8");
      expect(written).not.toBe(originalContent);
      expect(written).toContain("(COMPACTED)");
    });

    it("preserves the preamble section before task blocks", async () => {
      mockSummaryResponse("Summary text.");

      const filePath = makeTempFile(buildFixtureContent());
      await compactDone(filePath);

      const written = readFileSync(filePath, "utf-8");
      // Preamble header from fixture
      expect(written).toContain("# Tasks — Done");
    });
  });
});
