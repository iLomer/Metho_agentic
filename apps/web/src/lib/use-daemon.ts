"use client";

import { useState, useEffect, useRef, useCallback } from "react";

type DaemonStatus = "disconnected" | "connecting" | "connected";

interface SessionInfo {
  session_id: string;
  project_path: string;
  agent: string;
  pid: number;
  started_at: string;
}

interface TaskItem {
  id: string;
  title: string;
  body: string;
  column: string;
}

interface BoardSummary {
  backlog: number;
  todo: number;
  "in-progress": number;
  "in-testing": number;
  done: number;
}

interface StreamLine {
  session_id: string;
  data: string;
  timestamp: number;
}

interface UseDaemonReturn {
  status: DaemonStatus;
  connect: (port?: number) => void;
  disconnect: () => void;
  activeSessions: SessionInfo[];
  streamLines: StreamLine[];
  dispatchAgent: (projectPath: string, agent: string, prompt: string) => void;
  cancelSession: (sessionId: string) => void;
  readBoard: (projectPath: string) => Promise<{ tasks: TaskItem[]; summary: BoardSummary } | null>;
  createTask: (projectPath: string, taskId: string, title: string, body: string) => Promise<boolean>;
  moveTask: (projectPath: string, taskId: string, from: string, to: string) => Promise<boolean>;
  lastError: string | null;
  completedSessions: { session_id: string; exit_code: number }[];
}

let requestId = 0;
function nextId(): string {
  requestId++;
  return `req-${requestId}`;
}

export function useDaemon(): UseDaemonReturn {
  const [status, setStatus] = useState<DaemonStatus>("disconnected");
  const [activeSessions, setActiveSessions] = useState<SessionInfo[]>([]);
  const [streamLines, setStreamLines] = useState<StreamLine[]>([]);
  const [lastError, setLastError] = useState<string | null>(null);
  const [completedSessions, setCompletedSessions] = useState<{ session_id: string; exit_code: number }[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const pendingRef = useRef<Map<string, (data: unknown) => void>>(new Map());

  const handleMessage = useCallback((event: MessageEvent) => {
    const msg = JSON.parse(event.data as string) as Record<string, unknown>;

    switch (msg.type) {
      case "pong":
        break;

      case "status_response":
        setActiveSessions(msg.active_sessions as SessionInfo[]);
        break;

      case "session_started":
        setActiveSessions((prev) => [
          ...prev,
          {
            session_id: msg.session_id as string,
            project_path: msg.project_path as string,
            agent: "",
            pid: msg.pid as number,
            started_at: new Date().toISOString(),
          },
        ]);
        break;

      case "stream_event":
        setStreamLines((prev) => [
          ...prev,
          {
            session_id: msg.session_id as string,
            data: msg.data as string,
            timestamp: Date.now(),
          },
        ]);
        break;

      case "session_completed":
        setActiveSessions((prev) => prev.filter((s) => s.session_id !== msg.session_id));
        setCompletedSessions((prev) => [
          ...prev,
          { session_id: msg.session_id as string, exit_code: msg.exit_code as number },
        ]);
        break;

      case "session_error":
        setActiveSessions((prev) => prev.filter((s) => s.session_id !== msg.session_id));
        setLastError(`Session error: ${msg.error as string}`);
        break;

      case "error":
        setLastError(msg.message as string);
        break;

      case "board_result":
      case "task_created":
      case "task_moved": {
        const id = msg.id as string;
        const resolver = pendingRef.current.get(id);
        if (resolver) {
          resolver(msg);
          pendingRef.current.delete(id);
        }
        break;
      }
    }
  }, []);

  const connect = useCallback((port: number = 7890) => {
    if (wsRef.current) {
      wsRef.current.close();
    }

    setStatus("connecting");
    setLastError(null);

    const ws = new WebSocket(`ws://127.0.0.1:${port}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus("connected");
      ws.send(JSON.stringify({ type: "status" }));
    };

    ws.onmessage = handleMessage;

    ws.onclose = () => {
      setStatus("disconnected");
      wsRef.current = null;
    };

    ws.onerror = () => {
      setLastError("Failed to connect to daemon. Is it running?");
      setStatus("disconnected");
    };
  }, [handleMessage]);

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    setStatus("disconnected");
  }, []);

  const sendMessage = useCallback((msg: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  const sendAndWait = useCallback((msg: Record<string, unknown>): Promise<unknown> => {
    return new Promise((resolve) => {
      const id = nextId();
      pendingRef.current.set(id, resolve);
      sendMessage({ ...msg, id });

      // Timeout after 30 seconds
      setTimeout(() => {
        if (pendingRef.current.has(id)) {
          pendingRef.current.delete(id);
          resolve(null);
        }
      }, 30000);
    });
  }, [sendMessage]);

  const dispatchAgent = useCallback((projectPath: string, agent: string, prompt: string) => {
    setStreamLines([]);
    sendMessage({ type: "dispatch", id: nextId(), project_path: projectPath, agent, prompt });
  }, [sendMessage]);

  const cancelSessionFn = useCallback((sessionId: string) => {
    sendMessage({ type: "cancel", session_id: sessionId });
  }, [sendMessage]);

  const readBoardFn = useCallback(async (projectPath: string) => {
    const result = await sendAndWait({ type: "read_board", project_path: projectPath });
    if (result && typeof result === "object" && "tasks" in result) {
      const r = result as { tasks: TaskItem[]; summary: BoardSummary };
      return { tasks: r.tasks, summary: r.summary };
    }
    return null;
  }, [sendAndWait]);

  const createTaskFn = useCallback(async (projectPath: string, taskId: string, title: string, body: string) => {
    const result = await sendAndWait({ type: "create_task", project_path: projectPath, task_id: taskId, title, body });
    if (result && typeof result === "object" && "success" in result) {
      return (result as { success: boolean }).success;
    }
    return false;
  }, [sendAndWait]);

  const moveTaskFn = useCallback(async (projectPath: string, taskId: string, from: string, to: string) => {
    const result = await sendAndWait({ type: "move_task", project_path: projectPath, task_id: taskId, from, to });
    if (result && typeof result === "object" && "success" in result) {
      return (result as { success: boolean }).success;
    }
    return false;
  }, [sendAndWait]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      wsRef.current?.close();
    };
  }, []);

  return {
    status,
    connect,
    disconnect,
    activeSessions,
    streamLines,
    dispatchAgent,
    cancelSession: cancelSessionFn,
    readBoard: readBoardFn,
    createTask: createTaskFn,
    moveTask: moveTaskFn,
    lastError,
    completedSessions,
  };
}
