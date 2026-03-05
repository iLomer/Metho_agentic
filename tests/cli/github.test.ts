import { describe, it, expect, vi, beforeEach } from "vitest";
import { checkGhInstalled, checkGhAuthenticated } from "../../src/cli/github.js";

/**
 * Mock child_process.execFile to control whether gh commands succeed or fail.
 */
vi.mock("node:child_process", () => ({
  execFile: vi.fn(),
}));

import { execFile } from "node:child_process";

const mockedExecFile = vi.mocked(execFile);

beforeEach(() => {
  vi.resetAllMocks();
});

describe("checkGhInstalled", () => {
  it("returns true when gh --version succeeds", async () => {
    mockedExecFile.mockImplementation(
      (_command: string, _args: readonly string[] | undefined | null, callback: unknown) => {
        (callback as (error: Error | null) => void)(null);
        return undefined as never;
      },
    );

    const result = await checkGhInstalled();
    expect(result).toBe(true);
  });

  it("returns false when gh --version fails", async () => {
    mockedExecFile.mockImplementation(
      (_command: string, _args: readonly string[] | undefined | null, callback: unknown) => {
        (callback as (error: Error | null) => void)(new Error("not found"));
        return undefined as never;
      },
    );

    const result = await checkGhInstalled();
    expect(result).toBe(false);
  });

  it("calls execFile with gh and --version", async () => {
    mockedExecFile.mockImplementation(
      (_command: string, _args: readonly string[] | undefined | null, callback: unknown) => {
        (callback as (error: Error | null) => void)(null);
        return undefined as never;
      },
    );

    await checkGhInstalled();

    expect(mockedExecFile).toHaveBeenCalledWith(
      "gh",
      ["--version"],
      expect.any(Function),
    );
  });
});

describe("checkGhAuthenticated", () => {
  it("returns true when gh auth status succeeds", async () => {
    mockedExecFile.mockImplementation(
      (_command: string, _args: readonly string[] | undefined | null, callback: unknown) => {
        (callback as (error: Error | null) => void)(null);
        return undefined as never;
      },
    );

    const result = await checkGhAuthenticated();
    expect(result).toBe(true);
  });

  it("returns false when gh auth status fails", async () => {
    mockedExecFile.mockImplementation(
      (_command: string, _args: readonly string[] | undefined | null, callback: unknown) => {
        (callback as (error: Error | null) => void)(new Error("not logged in"));
        return undefined as never;
      },
    );

    const result = await checkGhAuthenticated();
    expect(result).toBe(false);
  });

  it("calls execFile with gh, auth, and status", async () => {
    mockedExecFile.mockImplementation(
      (_command: string, _args: readonly string[] | undefined | null, callback: unknown) => {
        (callback as (error: Error | null) => void)(null);
        return undefined as never;
      },
    );

    await checkGhAuthenticated();

    expect(mockedExecFile).toHaveBeenCalledWith(
      "gh",
      ["auth", "status"],
      expect.any(Function),
    );
  });
});
