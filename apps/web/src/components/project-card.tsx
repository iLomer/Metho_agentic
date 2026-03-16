import Link from "next/link";
import { getTechColor } from "@/lib/tech-colors";

interface ProjectCardProps {
  id: string;
  name: string;
  description: string | null;
  status: string;
  stack: string[];
  monthly_cost: number;
  updated_at: string;
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
  }).format(date);
}

function isDeadCost(status: string, monthlyCost: number): boolean {
  return (status === "paused" || status === "archived") && monthlyCost > 0;
}

export function ProjectCard({
  id,
  name,
  description,
  status,
  stack,
  monthly_cost,
  updated_at,
}: ProjectCardProps) {
  const deadCost = isDeadCost(status, monthly_cost);

  return (
    <Link
      href={`/dashboard/projects/${id}`}
      className={`group block border-b border-neutral-800/40 px-1 py-3 transition-colors hover:bg-neutral-900/50 ${
        deadCost ? "border-l-2 border-l-amber-600" : ""
      }`}
    >
      <div className="flex items-center gap-2">
        <span className={`inline-block h-1.5 w-1.5 rounded-full ${statusColor(status)} shrink-0`} />
        <h2 className="min-w-0 flex-1 truncate font-mono text-sm font-medium text-neutral-200 group-hover:text-cyan-400">
          {name}
        </h2>
        {deadCost && (
          <span className="font-mono text-[10px] uppercase tracking-wider text-amber-500">
            dead
          </span>
        )}
        <span className="shrink-0 font-mono text-xs tabular-nums text-neutral-600">
          {monthly_cost > 0 ? `${formatCost(monthly_cost)}/mo` : "$0"}
        </span>
      </div>

      {description && (
        <p className="mt-1 pl-3.5 font-mono text-[11px] text-neutral-500 line-clamp-1">
          {description}
        </p>
      )}

      <div className="mt-1.5 flex items-center gap-2 pl-3.5">
        {stack.length > 0 && (
          <div className="flex flex-wrap gap-x-0.5 gap-y-0.5">
            {stack.map((tech, i) => (
              <span key={tech} className="flex items-center gap-0.5">
                <span className={`font-mono text-[10px] ${getTechColor(tech)}`}>
                  {tech}
                </span>
                {i < stack.length - 1 && (
                  <span className="font-mono text-[10px] text-neutral-800">·</span>
                )}
              </span>
            ))}
          </div>
        )}
        <span className="ml-auto shrink-0 font-mono text-[10px] text-neutral-700">
          {formatDate(updated_at)}
        </span>
      </div>
    </Link>
  );
}
