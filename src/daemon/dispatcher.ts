import { spawn, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import type { SessionInfo } from "./types.js";

interface ActiveSession {
  id: string;
  projectPath: string;
  agent: string;
  process: ChildProcess;
  pid: number;
  startedAt: string;
}

type EventCallback = (sessionId: string, event: string) => void;
type CompleteCallback = (sessionId: string, exitCode: number) => void;
type ErrorCallback = (sessionId: string, error: string) => void;

const activeSessions = new Map<string, ActiveSession>();

/**
 * Dispatches a Claude Code session in the given project directory.
 * Spawns `claude -p "prompt" --output-format stream-json` and streams output.
 */
export function dispatch(
  projectPath: string,
  agent: string,
  prompt: string,
  onEvent: EventCallback,
  onComplete: CompleteCallback,
  onError: ErrorCallback,
): { sessionId: string; pid: number } | { error: string } {
  // Check if this project already has an active session
  for (const session of activeSessions.values()) {
    if (session.projectPath === projectPath) {
      return { error: `Project already has an active session (${session.id})` };
    }
  }

  const sessionId = randomUUID();

  const args = ["-p", prompt, "--verbose", "--output-format", "stream-json"];

  const child = spawn("claude", args, {
    cwd: projectPath,
    env: { ...process.env },
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (!child.pid) {
    return { error: "Failed to spawn claude process. Is Claude Code installed?" };
  }

  const session: ActiveSession = {
    id: sessionId,
    projectPath,
    agent,
    process: child,
    pid: child.pid,
    startedAt: new Date().toISOString(),
  };

  activeSessions.set(sessionId, session);

  // Stream stdout line by line
  let buffer = "";
  child.stdout?.on("data", (chunk: Buffer) => {
    buffer += chunk.toString();
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (line.trim()) {
        onEvent(sessionId, line);
      }
    }
  });

  // Capture stderr and forward to cockpit
  child.stderr?.on("data", (chunk: Buffer) => {
    const text = chunk.toString().trim();
    if (text) {
      onEvent(sessionId, `[stderr] ${text}`);
    }
  });

  child.on("close", (code) => {
    // Flush remaining buffer
    if (buffer.trim()) {
      onEvent(sessionId, buffer.trim());
    }
    activeSessions.delete(sessionId);
    onComplete(sessionId, code ?? 1);
  });

  child.on("error", (err) => {
    activeSessions.delete(sessionId);
    onError(sessionId, err.message);
  });

  return { sessionId, pid: child.pid };
}

/**
 * Cancels an active session by killing the process.
 */
export function cancelSession(sessionId: string): boolean {
  const session = activeSessions.get(sessionId);
  if (!session) return false;

  session.process.kill("SIGTERM");
  activeSessions.delete(sessionId);
  return true;
}

/**
 * Returns info about all active sessions.
 */
export function getActiveSessions(): SessionInfo[] {
  return Array.from(activeSessions.values()).map((s) => ({
    session_id: s.id,
    project_path: s.projectPath,
    agent: s.agent,
    pid: s.pid,
    started_at: s.startedAt,
  }));
}
