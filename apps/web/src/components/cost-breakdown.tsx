"use client";

import { useState } from "react";
import Link from "next/link";

interface CostBreakdownProject {
  id: string;
  name: string;
  status: string;
  monthly_cost: number;
}

interface CostBreakdownProps {
  projects: CostBreakdownProject[];
  totalMonthlyCost: number;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function statusDot(status: string): string {
  switch (status) {
    case "active":
      return "bg-green-400";
    case "paused":
      return "bg-yellow-400";
    default:
      return "bg-neutral-600";
  }
}

export function CostBreakdown({
  projects,
  totalMonthlyCost,
}: CostBreakdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  const paidProjects = projects
    .filter((p) => p.monthly_cost > 0)
    .sort((a, b) => b.monthly_cost - a.monthly_cost);

  const freeProjects = projects
    .filter((p) => p.monthly_cost === 0)
    .sort((a, b) => a.name.localeCompare(b.name));

  const sortedProjects = [...paidProjects, ...freeProjects];

  if (projects.length === 0) return null;

  return (
    <div className="mb-4">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-1.5 font-mono text-xs text-neutral-600 transition-colors hover:text-neutral-400"
      >
        <span className={`transition-transform ${isOpen ? "rotate-90" : ""}`}>▸</span>
        cost breakdown
      </button>

      {isOpen && (
        <div className="mt-2 border-l border-neutral-800 pl-3">
          {sortedProjects.map((project) => {
            const percentage =
              totalMonthlyCost > 0
                ? (project.monthly_cost / totalMonthlyCost) * 100
                : 0;
            const isFree = project.monthly_cost === 0;

            return (
              <div
                key={project.id}
                className={`flex items-center gap-2 py-1 ${isFree ? "opacity-40" : ""}`}
              >
                <span className={`h-1 w-1 rounded-full ${statusDot(project.status)} shrink-0`} />
                <Link
                  href={`/dashboard/projects/${project.id}`}
                  className="min-w-0 flex-1 truncate font-mono text-xs text-neutral-400 hover:text-cyan-400"
                >
                  {project.name}
                </Link>
                <span className="shrink-0 font-mono text-xs tabular-nums text-neutral-600">
                  {isFree ? "$0" : formatCurrency(project.monthly_cost)}
                </span>
                <span className="w-10 shrink-0 text-right font-mono text-[10px] tabular-nums text-neutral-700">
                  {isFree ? "—" : `${percentage.toFixed(0)}%`}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
