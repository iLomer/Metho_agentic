import { WebSocketServer, type WebSocket } from "ws";
import { readBoard, createTask, moveTask } from "./board.js";
import { dispatch, cancelSession, getActiveSessions } from "./dispatcher.js";
import type { CockpitMessage, DaemonMessage } from "./types.js";

function send(ws: WebSocket, msg: DaemonMessage): void {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

/**
 * Handles a single message from the cockpit/dashboard.
 */
async function handleMessage(ws: WebSocket, raw: string): Promise<void> {
  let msg: CockpitMessage;
  try {
    msg = JSON.parse(raw) as CockpitMessage;
  } catch {
    send(ws, { type: "error", message: "Invalid JSON" });
    return;
  }

  switch (msg.type) {
    case "ping": {
      send(ws, { type: "pong" });
      break;
    }

    case "status": {
      send(ws, { type: "status_response", active_sessions: getActiveSessions() });
      break;
    }

    case "read_board": {
      const { tasks, summary } = await readBoard(msg.project_path);
      send(ws, { type: "board_result", id: msg.id, tasks, summary });
      break;
    }

    case "create_task": {
      const result = await createTask(msg.project_path, msg.task_id, msg.title, msg.body);
      send(ws, { type: "task_created", id: msg.id, success: result.success, error: result.error });
      break;
    }

    case "move_task": {
      const result = await moveTask(msg.project_path, msg.task_id, msg.from, msg.to);
      send(ws, { type: "task_moved", id: msg.id, success: result.success, error: result.error });
      break;
    }

    case "dispatch": {
      const result = dispatch(
        msg.project_path,
        msg.agent,
        msg.prompt,
        (sessionId, data) => send(ws, { type: "stream_event", session_id: sessionId, data }),
        (sessionId, exitCode) => send(ws, { type: "session_completed", session_id: sessionId, exit_code: exitCode }),
        (sessionId, error) => send(ws, { type: "session_error", session_id: sessionId, error }),
      );

      if ("error" in result) {
        send(ws, { type: "error", message: result.error });
      } else {
        send(ws, {
          type: "session_started",
          session_id: result.sessionId,
          project_path: msg.project_path,
          pid: result.pid,
        });
      }
      break;
    }

    case "cancel": {
      const cancelled = cancelSession(msg.session_id);
      if (!cancelled) {
        send(ws, { type: "error", message: `Session ${msg.session_id} not found` });
      }
      break;
    }

    default: {
      send(ws, { type: "error", message: "Unknown message type" });
    }
  }
}

/**
 * Starts the daemon WebSocket server.
 */
export function startServer(port: number): void {
  const wss = new WebSocketServer({ host: "127.0.0.1", port });

  process.stdout.write(`\n  meto daemon running on ws://127.0.0.1:${port}\n\n`);
  process.stdout.write(`  waiting for cockpit connection...\n\n`);

  wss.on("connection", (ws) => {
    process.stdout.write(`  cockpit connected\n`);

    ws.on("message", (data) => {
      void handleMessage(ws, data.toString());
    });

    ws.on("close", () => {
      process.stdout.write(`  cockpit disconnected\n`);
    });

    ws.on("error", (err) => {
      process.stderr.write(`  websocket error: ${err.message}\n`);
    });
  });

  wss.on("error", (err) => {
    if ((err as NodeJS.ErrnoException).code === "EADDRINUSE") {
      process.stderr.write(`\n  error: port ${port} already in use. is another daemon running?\n\n`);
      process.exit(1);
    }
    process.stderr.write(`  server error: ${err.message}\n`);
  });

  // Graceful shutdown
  process.on("SIGINT", () => {
    process.stdout.write(`\n  shutting down daemon...\n`);
    wss.close();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    wss.close();
    process.exit(0);
  });
}
