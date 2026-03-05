import { describe, it, expect, vi, beforeEach } from "vitest";
import { checkClaudeCodeAvailable } from "../../src/cli/preflight.js";

/**
 * Mock child_process.execFile to control whether claude commands succeed or fail.
 */
vi.mock("node:child_process", () => ({
  execFile: vi.fn(),
}));

import { execFile } from "node:child_process";

const mockedExecFile = vi.mocked(execFile);

beforeEach(() => {
  vi.resetAllMocks();
});

describe("checkClaudeCodeAvailable", () => {
  it("returns true when claude --version succeeds", async () => {
    mockedExecFile.mockImplementation(
      (_command: string, _args: readonly string[] | undefined | null, callback: unknown) => {
        (callback as (error: Error | null) => void)(null);
        return undefined as never;
      },
    );

    const result = await checkClaudeCodeAvailable();
    expect(result).toBe(true);
  });

  it("returns false when claude --version fails", async () => {
    mockedExecFile.mockImplementation(
      (_command: string, _args: readonly string[] | undefined | null, callback: unknown) => {
        (callback as (error: Error | null) => void)(new Error("not found"));
        return undefined as never;
      },
    );

    const result = await checkClaudeCodeAvailable();
    expect(result).toBe(false);
  });

  it("calls execFile with claude and --version", async () => {
    mockedExecFile.mockImplementation(
      (_command: string, _args: readonly string[] | undefined | null, callback: unknown) => {
        (callback as (error: Error | null) => void)(null);
        return undefined as never;
      },
    );

    await checkClaudeCodeAvailable();

    expect(mockedExecFile).toHaveBeenCalledWith(
      "claude",
      ["--version"],
      expect.any(Function),
    );
  });
});
