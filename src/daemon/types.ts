/** Messages FROM the cockpit/dashboard TO the daemon */
export type CockpitMessage =
  | { type: "dispatch"; id: string; project_path: string; agent: string; prompt: string }
  | { type: "cancel"; session_id: string }
  | { type: "read_board"; id: string; project_path: string }
  | { type: "create_task"; id: string; project_path: string; task_id: string; title: string; body: string }
  | { type: "move_task"; id: string; project_path: string; task_id: string; from: string; to: string }
  | { type: "ping" }
  | { type: "status" };

/** Messages FROM the daemon TO the cockpit/dashboard */
export type DaemonMessage =
  | { type: "session_started"; session_id: string; project_path: string; pid: number }
  | { type: "stream_event"; session_id: string; data: string }
  | { type: "session_completed"; session_id: string; exit_code: number }
  | { type: "session_error"; session_id: string; error: string }
  | { type: "board_result"; id: string; tasks: TaskItem[]; summary: BoardSummary }
  | { type: "task_created"; id: string; success: boolean; error?: string }
  | { type: "task_moved"; id: string; success: boolean; error?: string }
  | { type: "pong" }
  | { type: "status_response"; active_sessions: SessionInfo[] }
  | { type: "error"; message: string };

export interface SessionInfo {
  session_id: string;
  project_path: string;
  agent: string;
  pid: number;
  started_at: string;
}

export interface TaskItem {
  id: string;
  title: string;
  body: string;
  column: string;
}

export interface BoardSummary {
  backlog: number;
  todo: number;
  "in-progress": number;
  "in-testing": number;
  done: number;
}
