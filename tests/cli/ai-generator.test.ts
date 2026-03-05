import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { ChildProcess } from "node:child_process";
import { EventEmitter } from "node:events";
import type { AIGenerationContext } from "../../src/cli/ai-generator.js";

/**
 * Mock child_process.spawn to control the Claude Code subprocess behavior.
 */
vi.mock("node:child_process", () => ({
  spawn: vi.fn(),
}));

import { spawn } from "node:child_process";
import {
  generateWithAI,
  buildAIPrompt,
  AIGenerationError,
  AIGenerationTimeoutError,
} from "../../src/cli/ai-generator.js";

const mockedSpawn = vi.mocked(spawn);

const sampleContext: AIGenerationContext = {
  projectName: "test-project",
  description: "A test project for unit tests",
  targetUsers: "Developers",
  techStack: "nextjs-supabase",
  customStack: undefined,
};

/**
 * Creates a mock ChildProcess with controllable stdout, stderr, and events.
 * Uses plain EventEmitters for stdout/stderr so data events fire synchronously.
 */
function createMockChild(): {
  child: ChildProcess;
  emitClose: (code: number | null) => void;
  emitError: (err: Error) => void;
  pushStdout: (data: string) => void;
  pushStderr: (data: string) => void;
} {
  const emitter = new EventEmitter();
  const stdoutEmitter = new EventEmitter();
  const stderrEmitter = new EventEmitter();

  const child = Object.assign(emitter, {
    stdout: stdoutEmitter,
    stderr: stderrEmitter,
    stdin: null,
    stdio: [null, stdoutEmitter, stderrEmitter] as const,
    pid: 12345,
    connected: false,
    exitCode: null,
    signalCode: null,
    spawnargs: [] as string[],
    spawnfile: "claude",
    killed: false,
    kill: vi.fn(() => true),
    send: vi.fn(),
    disconnect: vi.fn(),
    unref: vi.fn(),
    ref: vi.fn(),
    [Symbol.dispose]: vi.fn(),
  }) as unknown as ChildProcess;

  return {
    child,
    emitClose: (code: number | null) => {
      emitter.emit("close", code);
    },
    emitError: (err: Error) => {
      emitter.emit("error", err);
    },
    pushStdout: (data: string) => {
      stdoutEmitter.emit("data", Buffer.from(data));
    },
    pushStderr: (data: string) => {
      stderrEmitter.emit("data", Buffer.from(data));
    },
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("buildAIPrompt", () => {
  it("includes the project name in the prompt", () => {
    const prompt = buildAIPrompt(sampleContext);
    expect(prompt).toContain("test-project");
  });

  it("includes the description in the prompt", () => {
    const prompt = buildAIPrompt(sampleContext);
    expect(prompt).toContain("A test project for unit tests");
  });

  it("includes the target users in the prompt", () => {
    const prompt = buildAIPrompt(sampleContext);
    expect(prompt).toContain("Developers");
  });

  it("includes section markers for all required sections", () => {
    const prompt = buildAIPrompt(sampleContext);
    const sections = [
      "PRODUCT_VISION",
      "PROBLEM_STATEMENT",
      "SUCCESS_CRITERIA",
      "VALUE_PROPOSITION",
      "OUT_OF_SCOPE",
      "EPICS",
      "STARTER_TASKS",
      "DEFINITION_OF_DONE",
    ];
    for (const section of sections) {
      expect(prompt).toContain(`---SECTION:${section}---`);
      expect(prompt).toContain(`---END:${section}---`);
    }
  });

  it("uses custom stack description when techStack is custom", () => {
    const customContext: AIGenerationContext = {
      ...sampleContext,
      techStack: "custom",
      customStack: "Django + PostgreSQL",
    };
    const prompt = buildAIPrompt(customContext);
    expect(prompt).toContain("Django + PostgreSQL");
  });

  it("includes epic format requirements", () => {
    const prompt = buildAIPrompt(sampleContext);
    expect(prompt).toContain("## E1 --");
    expect(prompt).toContain("**Goal:**");
    expect(prompt).toContain("**Status:** Not started");
  });

  it("includes task slice format requirements", () => {
    const prompt = buildAIPrompt(sampleContext);
    expect(prompt).toContain("## [slice-001]");
    expect(prompt).toContain("**User Story**");
    expect(prompt).toContain("**Acceptance Criteria**");
    expect(prompt).toContain("**Out of Scope**");
  });
});

describe("generateWithAI", () => {
  it("resolves with raw stdout on successful subprocess", async () => {
    const mock = createMockChild();
    mockedSpawn.mockReturnValue(mock.child);

    const promise = generateWithAI(sampleContext);

    mock.pushStdout("---SECTION:PRODUCT_VISION---\nGenerated content\n---END:PRODUCT_VISION---");
    mock.emitClose(0);

    const result = await promise;
    expect(result.raw).toContain("Generated content");
  });

  it("spawns claude with -p flag and the prompt", () => {
    const mock = createMockChild();
    mockedSpawn.mockReturnValue(mock.child);

    generateWithAI(sampleContext);

    expect(mockedSpawn).toHaveBeenCalledWith(
      "claude",
      ["-p", expect.stringContaining("test-project")],
      expect.objectContaining({ stdio: ["ignore", "pipe", "pipe"] }),
    );

    mock.emitClose(0);
  });

  it("rejects with AIGenerationError on non-zero exit code", async () => {
    const mock = createMockChild();
    mockedSpawn.mockReturnValue(mock.child);

    const promise = generateWithAI(sampleContext);

    mock.pushStderr("Something went wrong");
    mock.emitClose(1);

    await expect(promise).rejects.toThrow(AIGenerationError);
    await expect(promise).rejects.toThrow("Something went wrong");
  });

  it("includes exit code in AIGenerationError", async () => {
    const mock = createMockChild();
    mockedSpawn.mockReturnValue(mock.child);

    const promise = generateWithAI(sampleContext);

    mock.pushStderr("bad");
    mock.emitClose(2);

    try {
      await promise;
      expect.fail("Should have thrown");
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(AIGenerationError);
      expect((err as AIGenerationError).exitCode).toBe(2);
      expect((err as AIGenerationError).stderr).toBe("bad");
    }
  });

  it("rejects with AIGenerationTimeoutError when subprocess exceeds timeout", async () => {
    const mock = createMockChild();
    mockedSpawn.mockReturnValue(mock.child);

    const promise = generateWithAI(sampleContext, 5000);

    vi.advanceTimersByTime(5001);

    await expect(promise).rejects.toThrow(AIGenerationTimeoutError);
    await expect(promise).rejects.toThrow("5 seconds");
    expect(mock.child.kill).toHaveBeenCalledWith("SIGTERM");
  });

  it("uses default 90-second timeout when none specified", async () => {
    const mock = createMockChild();
    mockedSpawn.mockReturnValue(mock.child);

    const promise = generateWithAI(sampleContext);

    vi.advanceTimersByTime(90_001);

    await expect(promise).rejects.toThrow(AIGenerationTimeoutError);
    await expect(promise).rejects.toThrow("90 seconds");
  });

  it("rejects with AIGenerationError on spawn error", async () => {
    const mock = createMockChild();
    mockedSpawn.mockReturnValue(mock.child);

    const promise = generateWithAI(sampleContext);

    mock.emitError(new Error("spawn ENOENT"));

    await expect(promise).rejects.toThrow(AIGenerationError);
    await expect(promise).rejects.toThrow("spawn ENOENT");
  });

  it("clears timeout on successful completion", async () => {
    const mock = createMockChild();
    mockedSpawn.mockReturnValue(mock.child);

    const promise = generateWithAI(sampleContext, 5000);

    mock.pushStdout("content");
    mock.emitClose(0);

    await promise;

    // Advancing past the timeout should not cause issues
    vi.advanceTimersByTime(6000);
  });
});
