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
  extractTextFromStream,
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

/**
 * Wraps plain text into stream-json JSONL format (text_delta events).
 */
function toStreamJson(text: string): string {
  const lines: string[] = [];
  lines.push(JSON.stringify({ type: "stream_event", event: { type: "message_start" } }));
  // Split text into chunks to simulate streaming
  const chunkSize = 20;
  for (let i = 0; i < text.length; i += chunkSize) {
    const chunk = text.slice(i, i + chunkSize);
    lines.push(JSON.stringify({
      type: "stream_event",
      event: {
        type: "content_block_delta",
        delta: { type: "text_delta", text: chunk },
      },
    }));
  }
  lines.push(JSON.stringify({ type: "stream_event", event: { type: "message_stop" } }));
  return lines.join("\n") + "\n";
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

    const content = "---SECTION:PRODUCT_VISION---\nGenerated content\n---END:PRODUCT_VISION---";
    mock.pushStdout(toStreamJson(content));
    mock.emitClose(0);

    const result = await promise;
    expect(result.raw).toContain("Generated content");
  });

  it("spawns claude with -p flag, stream-json output, and the prompt", () => {
    const mock = createMockChild();
    mockedSpawn.mockReturnValue(mock.child);

    generateWithAI(sampleContext);

    expect(mockedSpawn).toHaveBeenCalledWith(
      "claude",
      ["-p", "--verbose", "--output-format", "stream-json", expect.stringContaining("test-project")],
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

  it("uses default 60-second inactivity timeout when none specified", async () => {
    const mock = createMockChild();
    mockedSpawn.mockReturnValue(mock.child);

    const promise = generateWithAI(sampleContext);

    vi.advanceTimersByTime(60_001);

    await expect(promise).rejects.toThrow(AIGenerationTimeoutError);
    await expect(promise).rejects.toThrow("60 seconds");
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

    mock.pushStdout(toStreamJson("content"));
    mock.emitClose(0);

    await promise;

    // Advancing past the timeout should not cause issues
    vi.advanceTimersByTime(6000);
  });

  it("resets inactivity timer when stdout data arrives", async () => {
    const mock = createMockChild();
    mockedSpawn.mockReturnValue(mock.child);

    const promise = generateWithAI(sampleContext, 5000);

    // Advance 4 seconds (under 5s timeout)
    vi.advanceTimersByTime(4000);

    // Push data — should reset the timer
    mock.pushStdout(JSON.stringify({
      type: "stream_event",
      event: { type: "content_block_delta", delta: { type: "text_delta", text: "chunk1" } },
    }) + "\n");

    // Advance another 4 seconds (8s total, but only 4s since last data)
    vi.advanceTimersByTime(4000);

    // Should NOT have timed out — still under 5s since last data
    expect(mock.child.kill).not.toHaveBeenCalled();

    // Now push final data and close
    mock.pushStdout(JSON.stringify({
      type: "stream_event",
      event: { type: "content_block_delta", delta: { type: "text_delta", text: "chunk2" } },
    }) + "\n");
    mock.emitClose(0);

    const result = await promise;
    expect(result.raw).toBe("chunk1chunk2");
  });
});

describe("extractTextFromStream", () => {
  it("extracts text from text_delta events", () => {
    const jsonl = [
      JSON.stringify({ type: "stream_event", event: { type: "message_start" } }),
      JSON.stringify({ type: "stream_event", event: { type: "content_block_delta", delta: { type: "text_delta", text: "Hello " } } }),
      JSON.stringify({ type: "stream_event", event: { type: "content_block_delta", delta: { type: "text_delta", text: "world" } } }),
      JSON.stringify({ type: "stream_event", event: { type: "message_stop" } }),
    ].join("\n");

    expect(extractTextFromStream(jsonl)).toBe("Hello world");
  });

  it("ignores non-text events", () => {
    const jsonl = [
      JSON.stringify({ type: "stream_event", event: { type: "content_block_delta", delta: { type: "input_json_delta", partial_json: "{}" } } }),
      JSON.stringify({ type: "stream_event", event: { type: "content_block_delta", delta: { type: "text_delta", text: "only this" } } }),
    ].join("\n");

    expect(extractTextFromStream(jsonl)).toBe("only this");
  });

  it("returns empty string for empty input", () => {
    expect(extractTextFromStream("")).toBe("");
  });

  it("skips malformed JSON lines gracefully", () => {
    const jsonl = [
      "not valid json",
      JSON.stringify({ type: "stream_event", event: { type: "content_block_delta", delta: { type: "text_delta", text: "ok" } } }),
      "{broken",
    ].join("\n");

    expect(extractTextFromStream(jsonl)).toBe("ok");
  });

  it("extracts text from result event (current format)", () => {
    const jsonl = [
      JSON.stringify({ type: "system", subtype: "init", session_id: "abc" }),
      JSON.stringify({ type: "assistant", message: { content: [{ type: "text", text: "Hello!" }] } }),
      JSON.stringify({ type: "result", subtype: "success", is_error: false, result: "Hello!" }),
    ].join("\n");

    expect(extractTextFromStream(jsonl)).toBe("Hello!");
  });

  it("prefers result event over stream_event format when both present", () => {
    const jsonl = [
      JSON.stringify({ type: "stream_event", event: { type: "content_block_delta", delta: { type: "text_delta", text: "old" } } }),
      JSON.stringify({ type: "result", subtype: "success", is_error: false, result: "new" }),
    ].join("\n");

    expect(extractTextFromStream(jsonl)).toBe("new");
  });

  it("falls back to stream_event format when no result event present", () => {
    const jsonl = [
      JSON.stringify({ type: "stream_event", event: { type: "content_block_delta", delta: { type: "text_delta", text: "fallback" } } }),
    ].join("\n");

    expect(extractTextFromStream(jsonl)).toBe("fallback");
  });
});
