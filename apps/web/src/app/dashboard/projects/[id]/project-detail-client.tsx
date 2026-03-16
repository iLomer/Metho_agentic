"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { updateProject, deleteProject, type FormState, type DeleteState } from "./actions";
import { ProjectFormFields } from "@/components/project-form-fields";
import { getTechColor } from "@/lib/tech-colors";
import type { ConnectedService, ProjectUrls } from "@/types/database";

interface ProjectData {
  id: string;
  name: string;
  description: string | null;
  status: string;
  stack: string[];
  ai_tools: string[];
  urls: ProjectUrls;
  connected_services: ConnectedService[];
  monthly_cost: number;
  notes: string | null;
  github_repo_full_name: string | null;
  has_meto_methodology: boolean;
  last_health_score: number | null;
  created_at: string;
  updated_at: string;
}

interface ProjectDetailClientProps {
  project: ProjectData;
}

const initialFormState: FormState = { errors: {}, success: false };
const initialDeleteState: DeleteState = { error: null };

function formatCost(cost: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cost);
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function statusColor(status: string): string {
  switch (status) {
    case "active":
      return "text-green-400";
    case "paused":
      return "text-yellow-400";
    default:
      return "text-neutral-600";
  }
}

export function ProjectDetailClient({ project }: ProjectDetailClientProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [state, formAction, isPending] = useActionState(
    updateProject,
    initialFormState,
  );
  const [deleteState, deleteAction, isDeleting] = useActionState(
    deleteProject,
    initialDeleteState,
  );

  if (state.success && isEditing) {
    setIsEditing(false);
  }

  const urlEntries = Object.entries(project.urls).filter(
    ([, value]) => value !== undefined,
  );

  const servicesSubtotal = project.connected_services.reduce(
    (sum, s) => sum + (s.monthly_cost ?? 0),
    0,
  );
  const hasUnlistedCosts =
    project.connected_services.length > 0 &&
    Math.abs(servicesSubtotal - project.monthly_cost) > 0.005;

  if (isEditing) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-6">
        <div className="mb-5 flex items-center justify-between">
          <h1 className="font-mono text-sm text-neutral-300">edit project</h1>
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="font-mono text-xs text-neutral-600 hover:text-neutral-400"
          >
            cancel
          </button>
        </div>

        {state.errors.form && (
          <div className="mb-4 border border-red-900 bg-red-950/50 px-3 py-2 font-mono text-xs text-red-400">
            {state.errors.form}
          </div>
        )}

        <form action={formAction} className="space-y-5">
          <input type="hidden" name="project_id" value={project.id} />

          <ProjectFormFields
            errors={state.errors}
            showStatus
            defaultValues={{
              name: project.name,
              description: project.description ?? "",
              status: project.status,
              stack: project.stack.join(", "),
              ai_tools: project.ai_tools.join(", "),
              notes: project.notes ?? "",
              urls: urlEntries.length > 0
                ? urlEntries.map(([key, value]) => ({
                    key,
                    value: value ?? "",
                  }))
                : [{ key: "", value: "" }],
              services: project.connected_services.length > 0
                ? project.connected_services.map((s) => ({
                    name: s.name,
                    cost: s.monthly_cost ? String(s.monthly_cost) : "",
                  }))
                : [{ name: "", cost: "" }],
            }}
          />

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="font-mono text-xs text-neutral-600 hover:text-neutral-400"
            >
              cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-md bg-cyan-400 px-3 py-1.5 font-mono text-xs font-medium text-neutral-950 transition-colors hover:bg-cyan-300 disabled:opacity-50"
            >
              {isPending ? "saving..." : "save"}
            </button>
          </div>
        </form>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-6">
      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="mx-4 w-full max-w-sm border border-neutral-800 bg-neutral-950 p-5">
            <h2 className="font-mono text-sm text-neutral-200">
              delete project
            </h2>
            <p className="mt-2 font-mono text-xs text-neutral-500">
              permanently delete{" "}
              <span className="text-neutral-300">{project.name}</span>?
              this cannot be undone.
            </p>

            {deleteState.error && (
              <div className="mt-3 border border-red-900 bg-red-950/50 px-3 py-2 font-mono text-xs text-red-400">
                {deleteState.error}
              </div>
            )}

            <div className="mt-4 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="font-mono text-xs text-neutral-600 hover:text-neutral-400 disabled:opacity-50"
              >
                cancel
              </button>
              <form action={deleteAction}>
                <input type="hidden" name="project_id" value={project.id} />
                <button
                  type="submit"
                  disabled={isDeleting}
                  className="rounded-md border border-red-800 bg-red-950 px-3 py-1.5 font-mono text-xs text-red-400 transition-colors hover:bg-red-900 disabled:opacity-50"
                >
                  {isDeleting ? "deleting..." : "delete"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <Link
          href="/dashboard"
          className="font-mono text-xs text-neutral-600 hover:text-neutral-400"
        >
          &larr; projects
        </Link>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="rounded-md border border-red-900 px-2.5 py-1 font-mono text-xs text-red-400 transition-colors hover:bg-red-950"
          >
            delete
          </button>
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="rounded-md border border-neutral-800 px-2.5 py-1 font-mono text-xs text-neutral-400 transition-colors hover:border-neutral-600 hover:text-neutral-200"
          >
            edit
          </button>
        </div>
      </div>

      {/* Title + Status */}
      <div className="flex items-center gap-3">
        <span className={`inline-block h-2 w-2 rounded-full ${statusColor(project.status)} shrink-0`} />
        <h1 className="min-w-0 flex-1 truncate font-mono text-lg font-medium text-neutral-200">
          {project.name}
        </h1>
        <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-600">
          {project.status}
        </span>
      </div>

      {/* Quick actions */}
      <div className="mt-3 flex items-center gap-3">
        {project.github_repo_full_name && (
          <Link
            href={`/dashboard/projects/${project.id}/board`}
            className="rounded-md border border-neutral-800 px-2.5 py-1 font-mono text-xs text-cyan-400 transition-colors hover:border-cyan-800 hover:bg-cyan-950/30"
          >
            view board
          </Link>
        )}
        {project.github_repo_full_name && (
          <span className="font-mono text-[10px] text-neutral-600">
            {project.github_repo_full_name}
          </span>
        )}
        {project.last_health_score !== null && (
          <span className={`font-mono text-[10px] ${
            project.last_health_score >= 80 ? "text-green-400" :
            project.last_health_score >= 50 ? "text-yellow-400" :
            "text-red-400"
          }`}>
            health: {project.last_health_score}%
          </span>
        )}
      </div>

      {/* Description */}
      {project.description && (
        <p className="mt-4 font-mono text-xs leading-relaxed text-neutral-400">
          {project.description}
        </p>
      )}

      {/* Stack */}
      {project.stack.length > 0 && (
        <div className="mt-5">
          <h2 className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-neutral-600">
            stack
          </h2>
          <div className="flex flex-wrap gap-x-0.5 gap-y-1">
            {project.stack.map((tech, i) => (
              <span key={tech} className="flex items-center gap-0.5">
                <span className={`font-mono text-xs ${getTechColor(tech)}`}>
                  {tech}
                </span>
                {i < project.stack.length - 1 && (
                  <span className="font-mono text-xs text-neutral-800">·</span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* AI Tools */}
      {project.ai_tools.length > 0 && (
        <div className="mt-4">
          <h2 className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-neutral-600">
            ai tools
          </h2>
          <div className="flex flex-wrap gap-x-0.5 gap-y-1">
            {project.ai_tools.map((tool, i) => (
              <span key={tool} className="flex items-center gap-0.5">
                <span className={`font-mono text-xs ${getTechColor(tool)}`}>
                  {tool}
                </span>
                {i < project.ai_tools.length - 1 && (
                  <span className="font-mono text-xs text-neutral-800">·</span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* URLs */}
      {urlEntries.length > 0 && (
        <div className="mt-5">
          <h2 className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-neutral-600">
            urls
          </h2>
          <div className="space-y-1">
            {urlEntries.map(([label, url]) => (
              <div key={label} className="flex items-center gap-2">
                <span className="font-mono text-xs text-neutral-600">{label}</span>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="break-all font-mono text-xs text-cyan-600 hover:text-cyan-400"
                >
                  {url}
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Connected Services */}
      {project.connected_services.length > 0 && (
        <div className="mt-5">
          <h2 className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-neutral-600">
            services
          </h2>
          <div className="border-l border-neutral-800 pl-3">
            {project.connected_services.map((service) => {
              const cost = service.monthly_cost ?? 0;
              const isFree = cost === 0;
              return (
                <div
                  key={service.name}
                  className={`flex items-center justify-between py-1 ${isFree ? "opacity-40" : ""}`}
                >
                  <span className="font-mono text-xs text-neutral-400">
                    {service.name}
                  </span>
                  <span className="font-mono text-xs tabular-nums text-neutral-600">
                    {isFree ? "$0" : `${formatCost(cost)}/mo`}
                  </span>
                </div>
              );
            })}
            <div className="mt-1 flex items-center justify-between border-t border-neutral-800/40 pt-1">
              <span className="font-mono text-xs text-neutral-500">subtotal</span>
              <span className="font-mono text-xs tabular-nums text-neutral-300">
                {formatCost(servicesSubtotal)}/mo
              </span>
            </div>
          </div>

          {hasUnlistedCosts && (
            <p className="mt-1.5 font-mono text-[10px] text-neutral-700">
              subtotal ({formatCost(servicesSubtotal)}) differs from total ({formatCost(project.monthly_cost)})
            </p>
          )}
        </div>
      )}

      {/* Monthly Cost Total */}
      <div className="mt-5 border-t border-neutral-800/40 pt-3">
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs text-neutral-500">total monthly cost</span>
          <span className="font-mono text-sm tabular-nums text-neutral-200">
            {project.monthly_cost > 0
              ? `${formatCost(project.monthly_cost)}/mo`
              : "$0"}
          </span>
        </div>
      </div>

      {/* Notes */}
      {project.notes && (
        <div className="mt-5">
          <h2 className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-neutral-600">
            notes
          </h2>
          <p className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-neutral-400">
            {project.notes}
          </p>
        </div>
      )}

      {/* Dates */}
      <div className="mt-5 flex items-center gap-4 font-mono text-[10px] text-neutral-700">
        <span>created {formatDate(project.created_at)}</span>
        <span>updated {formatDate(project.updated_at)}</span>
      </div>
    </main>
  );
}
