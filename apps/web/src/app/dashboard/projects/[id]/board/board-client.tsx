"use client";

import Link from "next/link";
import type { TaskItem, BoardSummary, BoardColumn } from "@/lib/github";

interface BoardClientProps {
  projectName: string;
  projectId: string;
  tasks: TaskItem[];
  summary: BoardSummary;
}

const COLUMNS: { key: BoardColumn; label: string; color: string }[] = [
  { key: "backlog", label: "backlog", color: "border-neutral-700" },
  { key: "todo", label: "todo", color: "border-blue-800" },
  { key: "in-progress", label: "in progress", color: "border-yellow-700" },
  { key: "in-testing", label: "testing", color: "border-purple-800" },
  { key: "done", label: "done", color: "border-green-800" },
];

function TaskCard({ task }: { task: TaskItem }) {
  return (
    <div className="border border-neutral-800/60 bg-neutral-900/50 p-2.5">
      <div className="flex items-center gap-2">
        <span className="font-mono text-[10px] text-neutral-600">{task.id}</span>
      </div>
      <p className="mt-1 font-mono text-xs text-neutral-300 line-clamp-2">
        {task.title}
      </p>
      {task.body && (
        <p className="mt-1 font-mono text-[10px] text-neutral-600 line-clamp-2">
          {task.body.slice(0, 120)}
        </p>
      )}
    </div>
  );
}

export function BoardClient({ projectName, projectId, tasks, summary }: BoardClientProps) {
  const totalTasks = Object.values(summary).reduce((a, b) => a + b, 0);

  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/projects/${projectId}`}
            className="font-mono text-xs text-neutral-600 hover:text-neutral-400"
          >
            &larr; {projectName}
          </Link>
        </div>
        <span className="font-mono text-[10px] text-neutral-600">
          {totalTasks} task{totalTasks !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Board */}
      <div className="grid grid-cols-5 gap-3">
        {COLUMNS.map((col) => {
          const columnTasks = tasks.filter((t) => t.column === col.key);
          return (
            <div key={col.key} className="min-h-[50vh]">
              {/* Column header */}
              <div className={`mb-3 border-t-2 ${col.color} pt-2`}>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-neutral-400">{col.label}</span>
                  <span className="font-mono text-[10px] text-neutral-600">
                    {columnTasks.length}
                  </span>
                </div>
              </div>

              {/* Cards */}
              <div className="space-y-2">
                {columnTasks.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
