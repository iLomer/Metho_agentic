import { describe, it, expect, vi, beforeEach } from "vitest";
import { checkSupabaseInstalled } from "../../src/cli/supabase.js";

/**
 * Mock child_process.execFile to control whether supabase commands succeed or fail.
 */
vi.mock("node:child_process", () => ({
  execFile: vi.fn(),
}));

import { execFile } from "node:child_process";

const mockedExecFile = vi.mocked(execFile);

beforeEach(() => {
  vi.resetAllMocks();
});

describe("checkSupabaseInstalled", () => {
  it("returns true when supabase --version succeeds", async () => {
    mockedExecFile.mockImplementation(
      (_command: string, _args: readonly string[] | undefined | null, callback: unknown) => {
        (callback as (error: Error | null) => void)(null);
        return undefined as never;
      },
    );

    const result = await checkSupabaseInstalled();
    expect(result).toBe(true);
  });

  it("returns false when supabase --version fails", async () => {
    mockedExecFile.mockImplementation(
      (_command: string, _args: readonly string[] | undefined | null, callback: unknown) => {
        (callback as (error: Error | null) => void)(new Error("not found"));
        return undefined as never;
      },
    );

    const result = await checkSupabaseInstalled();
    expect(result).toBe(false);
  });

  it("calls execFile with supabase and --version", async () => {
    mockedExecFile.mockImplementation(
      (_command: string, _args: readonly string[] | undefined | null, callback: unknown) => {
        (callback as (error: Error | null) => void)(null);
        return undefined as never;
      },
    );

    await checkSupabaseInstalled();

    expect(mockedExecFile).toHaveBeenCalledWith(
      "supabase",
      ["--version"],
      expect.any(Function),
    );
  });
});
