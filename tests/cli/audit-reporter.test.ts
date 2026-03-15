import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as p from "@clack/prompts";
import {
  reportAuditResults,
  type LayerResult,
  type CheckResult,
} from "../../src/cli/audit/reporter.js";

// ---------------------------------------------------------------------------
// Mock @clack/prompts log methods to capture output
// ---------------------------------------------------------------------------

vi.mock("@clack/prompts", () => ({
  log: {
    message: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCheck(
  description: string,
  status: "pass" | "fail" | "skip",
  message?: string,
  suggestedFix?: string,
): CheckResult {
  return { description, status, message, suggestedFix };
}

function makeLayer(
  layerId: number,
  layerName: string,
  checks: CheckResult[],
  skipped = false,
): LayerResult {
  return { layerId, layerName, skipped, checks };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("reportAuditResults -- skipped layers", () => {
  it("displays skip message for skipped layers", () => {
    const results: LayerResult[] = [
      makeLayer(1, "Methodology", [], true),
    ];

    reportAuditResults(results);

    expect(p.log.message).toHaveBeenCalledWith(
      expect.stringContaining("skipped -- previous layer incomplete"),
    );
    expect(p.log.message).toHaveBeenCalledWith(
      expect.stringContaining("Layer 1 -- Methodology"),
    );
  });

  it("does not count skipped layers in total", () => {
    const results: LayerResult[] = [
      makeLayer(0, "Prerequisites", [makeCheck("Git", "pass")]),
      makeLayer(1, "Methodology", [], true),
    ];

    reportAuditResults(results);

    // Overall should be 1/1, not 1/0 or something weird
    expect(p.log.success).toHaveBeenCalledWith(
      expect.stringContaining("1/1 checks passed (100%)"),
    );
  });
});

describe("reportAuditResults -- progress bar and checks", () => {
  it("shows progress bar for non-skipped layers", () => {
    const results: LayerResult[] = [
      makeLayer(0, "Prerequisites", [
        makeCheck("Git", "pass"),
        makeCheck("README", "fail", "No README found"),
      ]),
    ];

    reportAuditResults(results);

    const messageCall = vi.mocked(p.log.message).mock.calls[0][0];
    // Should contain the layer header
    expect(messageCall).toContain("Layer 0 -- Prerequisites");
    // Should contain percentage
    expect(messageCall).toContain("50%");
    // Should contain counts
    expect(messageCall).toContain("(1/2)");
  });

  it("shows pass indicator for passed checks", () => {
    const results: LayerResult[] = [
      makeLayer(0, "Test", [makeCheck("My check", "pass")]),
    ];

    reportAuditResults(results);

    const messageCall = vi.mocked(p.log.message).mock.calls[0][0];
    expect(messageCall).toContain("\u2713"); // checkmark
    expect(messageCall).toContain("My check");
  });

  it("shows fail indicator with message for failed checks", () => {
    const results: LayerResult[] = [
      makeLayer(0, "Test", [
        makeCheck("Missing file", "fail", "Not found"),
      ]),
    ];

    reportAuditResults(results);

    const messageCall = vi.mocked(p.log.message).mock.calls[0][0];
    expect(messageCall).toContain("\u2717"); // cross mark
    expect(messageCall).toContain("Missing file");
    expect(messageCall).toContain("Not found");
  });

  it("shows suggested fix when present on fail", () => {
    const results: LayerResult[] = [
      makeLayer(0, "Test", [
        makeCheck("Missing file", "fail", "Not found", "Run meto-cli init"),
      ]),
    ];

    reportAuditResults(results);

    const messageCall = vi.mocked(p.log.message).mock.calls[0][0];
    expect(messageCall).toContain("\u2192"); // arrow
    expect(messageCall).toContain("Run meto-cli init");
  });

  it("shows skip indicator for skipped checks", () => {
    const results: LayerResult[] = [
      makeLayer(0, "Test", [makeCheck("Skipped check", "skip")]),
    ];

    reportAuditResults(results);

    const messageCall = vi.mocked(p.log.message).mock.calls[0][0];
    expect(messageCall).toContain("- Skipped check");
  });
});

describe("reportAuditResults -- overall summary", () => {
  it("shows success when all checks pass", () => {
    const results: LayerResult[] = [
      makeLayer(0, "L0", [
        makeCheck("A", "pass"),
        makeCheck("B", "pass"),
      ]),
      makeLayer(1, "L1", [
        makeCheck("C", "pass"),
      ]),
    ];

    reportAuditResults(results);

    expect(p.log.success).toHaveBeenCalledWith(
      expect.stringContaining("3/3 checks passed (100%)"),
    );
    expect(p.log.info).not.toHaveBeenCalled();
  });

  it("shows info (not success) when some checks fail", () => {
    const results: LayerResult[] = [
      makeLayer(0, "L0", [
        makeCheck("A", "pass"),
        makeCheck("B", "fail"),
      ]),
    ];

    reportAuditResults(results);

    expect(p.log.info).toHaveBeenCalledWith(
      expect.stringContaining("1/2 checks passed (50%)"),
    );
    expect(p.log.success).not.toHaveBeenCalled();
  });

  it("shows 0% when no checks pass", () => {
    const results: LayerResult[] = [
      makeLayer(0, "L0", [
        makeCheck("A", "fail"),
        makeCheck("B", "fail"),
      ]),
    ];

    reportAuditResults(results);

    expect(p.log.info).toHaveBeenCalledWith(
      expect.stringContaining("0/2 checks passed (0%)"),
    );
  });

  it("handles empty results gracefully", () => {
    reportAuditResults([]);
    // 0 total checks, 0% -- should not crash
    expect(p.log.info).toHaveBeenCalledWith(
      expect.stringContaining("0/0 checks passed (0%)"),
    );
  });
});

describe("reportAuditResults -- progress bar rendering", () => {
  it("renders 100% bar when all pass", () => {
    const results: LayerResult[] = [
      makeLayer(0, "Test", [
        makeCheck("A", "pass"),
        makeCheck("B", "pass"),
        makeCheck("C", "pass"),
        makeCheck("D", "pass"),
        makeCheck("E", "pass"),
      ]),
    ];

    reportAuditResults(results);

    const messageCall = vi.mocked(p.log.message).mock.calls[0][0];
    expect(messageCall).toContain("100%");
    expect(messageCall).toContain("(5/5)");
    // Should have filled blocks and no empty blocks
    expect(messageCall).toContain("\u2588".repeat(20));
    expect(messageCall).not.toContain("\u2591");
  });

  it("renders 0% bar when all fail", () => {
    const results: LayerResult[] = [
      makeLayer(0, "Test", [
        makeCheck("A", "fail"),
        makeCheck("B", "fail"),
      ]),
    ];

    reportAuditResults(results);

    const messageCall = vi.mocked(p.log.message).mock.calls[0][0];
    expect(messageCall).toContain("0%");
    expect(messageCall).toContain("(0/2)");
    // Should have empty blocks and no filled blocks
    expect(messageCall).toContain("\u2591".repeat(20));
    expect(messageCall).not.toContain("\u2588");
  });
});
