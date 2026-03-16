"use client";

import { useState } from "react";
import Link from "next/link";
import { useDaemon } from "@/lib/use-daemon";
import { parseStreamLine } from "@/lib/parse-stream";

interface Project {
  id: string;
  name: string;
  repo: string | null;
  hasMeto: boolean;
}

interface AgentsClientProps {
  projects: Project[];
}

export function AgentsClient({ projects }: AgentsClientProps) {
  const daemon = useDaemon();
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [projectPath, setProjectPath] = useState<string>("");
  const [agent, setAgent] = useState<string>("developer");
  const [prompt, setPrompt] = useState<string>("");

  function handleDispatch() {
    if (!projectPath || !prompt) return;
    daemon.dispatchAgent(projectPath, agent, prompt);
    setPrompt("");
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-5 flex items-center justify-between">
        <Link
          href="/dashboard"
          className="font-mono text-xs text-neutral-600 hover:text-neutral-400"
        >
          &larr; dashboard
        </Link>
        <h1 className="font-mono text-sm text-neutral-300">agents</h1>
      </div>

      {/* Daemon Connection */}
      <div className="mb-6 border border-neutral-800 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className={`inline-block h-2 w-2 rounded-full ${
              daemon.status === "connected" ? "bg-green-400" :
              daemon.status === "connecting" ? "bg-yellow-400 animate-pulse" :
              "bg-neutral-600"
            }`} />
            <span className="font-mono text-xs text-neutral-400">
              daemon: {daemon.status}
            </span>
          </div>

          {daemon.status === "disconnected" ? (
            <button
              type="button"
              onClick={() => daemon.connect()}
              className="rounded-md bg-cyan-400 px-3 py-1.5 font-mono text-xs font-medium text-neutral-950 transition-colors hover:bg-cyan-300"
            >
              connect
            </button>
          ) : (
            <button
              type="button"
              onClick={() => daemon.disconnect()}
              className="rounded-md border border-neutral-800 px-3 py-1.5 font-mono text-xs text-neutral-400 transition-colors hover:border-neutral-600"
            >
              disconnect
            </button>
          )}
        </div>

        {daemon.status === "disconnected" && (
          <p className="mt-2 font-mono text-[10px] text-neutral-600">
            run <span className="text-neutral-400">cd ~/Desktop/Buildrack/packages/daemon && npx tsx src/index.ts start</span> to start the daemon
          </p>
        )}

        {daemon.lastError && (
          <p className="mt-2 font-mono text-[10px] text-red-400">{daemon.lastError}</p>
        )}
      </div>

      {daemon.status !== "connected" && (
        <div className="flex min-h-[30vh] items-center justify-center">
          <p className="font-mono text-sm text-neutral-600">
            connect the daemon to dispatch agents
          </p>
        </div>
      )}

      {daemon.status === "connected" && (
        <>
          {/* Dispatch Panel */}
          <div className="mb-6 border border-neutral-800 p-4">
            <h2 className="mb-3 font-mono text-xs text-neutral-300">dispatch agent</h2>

            <div className="space-y-3">
              {/* Project selector */}
              <div>
                <label className="mb-1 block font-mono text-[10px] text-neutral-600">project</label>
                <select
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-1.5 font-mono text-xs text-neutral-200"
                >
                  <option value="">select project...</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Local path */}
              <div>
                <label className="mb-1 block font-mono text-[10px] text-neutral-600">local path</label>
                <input
                  type="text"
                  value={projectPath}
                  onChange={(e) => setProjectPath(e.target.value)}
                  placeholder="/Users/you/Desktop/your-project"
                  className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-1.5 font-mono text-xs text-neutral-200 placeholder:text-neutral-700"
                />
              </div>

              {/* Agent type */}
              <div>
                <label className="mb-1 block font-mono text-[10px] text-neutral-600">agent</label>
                <select
                  value={agent}
                  onChange={(e) => setAgent(e.target.value)}
                  className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-1.5 font-mono text-xs text-neutral-200"
                >
                  <option value="pm">@meto-pm</option>
                  <option value="developer">@meto-developer</option>
                  <option value="tester">@meto-tester</option>
                  <option value="custom">custom prompt</option>
                </select>
              </div>

              {/* Prompt */}
              <div>
                <label className="mb-1 block font-mono text-[10px] text-neutral-600">prompt</label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Read CLAUDE.md and pick up the top task from todo"
                  rows={3}
                  className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-1.5 font-mono text-xs text-neutral-200 placeholder:text-neutral-700"
                />
              </div>

              <button
                type="button"
                onClick={handleDispatch}
                disabled={!projectPath || !prompt}
                className="rounded-md bg-cyan-400 px-4 py-1.5 font-mono text-xs font-medium text-neutral-950 transition-colors hover:bg-cyan-300 disabled:opacity-30"
              >
                dispatch
              </button>
            </div>
          </div>

          {/* Active Sessions */}
          {daemon.activeSessions.length > 0 && (
            <div className="mb-6">
              <h2 className="mb-2 font-mono text-xs text-neutral-300">active sessions</h2>
              <div className="space-y-2">
                {daemon.activeSessions.map((session) => (
                  <div key={session.session_id} className="flex items-center justify-between border border-neutral-800 px-3 py-2">
                    <div>
                      <span className="font-mono text-xs text-neutral-300">{session.project_path.split("/").pop()}</span>
                      <span className="ml-2 font-mono text-[10px] text-neutral-600">pid: {session.pid}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => daemon.cancelSession(session.session_id)}
                      className="font-mono text-[10px] text-red-400 hover:text-red-300"
                    >
                      cancel
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Completed Sessions */}
          {daemon.completedSessions.length > 0 && (
            <div className="mb-6">
              <h2 className="mb-2 font-mono text-xs text-neutral-300">completed</h2>
              {daemon.completedSessions.map((s) => (
                <div key={s.session_id} className="font-mono text-[10px] text-neutral-600">
                  {s.session_id.slice(0, 8)}... exit: {s.exit_code === 0 ? (
                    <span className="text-green-400">0</span>
                  ) : (
                    <span className="text-red-400">{s.exit_code}</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Live Output */}
          {daemon.streamLines.length > 0 && (
            <div>
              <h2 className="mb-2 font-mono text-xs text-neutral-300">output</h2>
              <div className="max-h-[50vh] overflow-y-auto border border-neutral-800 bg-neutral-950 p-3 space-y-1">
                {daemon.streamLines.map((line, i) => {
                  const parsed = parseStreamLine(line.data);
                  if (!parsed) return null;
                  const colorClass =
                    parsed.type === "error" ? "text-red-400" :
                    parsed.type === "thinking" ? "text-neutral-600 italic" :
                    parsed.type === "system" ? "text-cyan-600" :
                    parsed.type === "tool" ? "text-yellow-400" :
                    "text-neutral-300";
                  return (
                    <div key={i} className={`font-mono text-[11px] leading-relaxed ${colorClass}`}>
                      {parsed.type === "thinking" && <span className="text-neutral-700 not-italic">thinking: </span>}
                      {parsed.content}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </main>
  );
}
