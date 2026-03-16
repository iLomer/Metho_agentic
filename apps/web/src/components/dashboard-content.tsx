"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { CostBanner } from "@/components/cost-banner";
import { CostBreakdown } from "@/components/cost-breakdown";
import { ProjectCard } from "@/components/project-card";

interface ProjectSummary {
  id: string;
  name: string;
  description: string | null;
  stack: string[];
  monthly_cost: number;
  status: string;
  updated_at: string;
}

interface DashboardContentProps {
  projects: ProjectSummary[];
}

const STATUS_FILTERS = [
  "all",
  "active",
  "paused",
  "archived",
  "dead-cost",
] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

const FILTER_LABELS: Record<StatusFilter, string> = {
  all: "all",
  active: "active",
  paused: "paused",
  archived: "archived",
  "dead-cost": "dead",
};

const VISIBLE_TABS: readonly StatusFilter[] = [
  "all",
  "active",
  "paused",
  "archived",
];

function isDeadCost(project: ProjectSummary): boolean {
  return (
    (project.status === "paused" || project.status === "archived") &&
    project.monthly_cost > 0
  );
}

export function DashboardContent({ projects }: DashboardContentProps) {
  const [activeFilter, setActiveFilter] = useState<StatusFilter>("all");

  const filteredProjects =
    activeFilter === "all"
      ? projects
      : activeFilter === "dead-cost"
        ? projects.filter(isDeadCost)
        : projects.filter((p) => p.status === activeFilter);

  const totalMonthlyCost = filteredProjects.reduce(
    (sum, p) => sum + p.monthly_cost,
    0,
  );
  const activeProjectCount = filteredProjects.filter(
    (p) => p.status === "active",
  ).length;

  const deadCostProjects = projects.filter(isDeadCost);
  const deadCostCount = deadCostProjects.length;
  const deadCostTotal = deadCostProjects.reduce(
    (sum, p) => sum + p.monthly_cost,
    0,
  );

  const handleDeadCostClick = useCallback(() => {
    setActiveFilter("dead-cost");
  }, []);

  const visibleTabs =
    activeFilter === "dead-cost"
      ? STATUS_FILTERS
      : VISIBLE_TABS;

  return (
    <>
      <CostBanner
        totalMonthlyCost={totalMonthlyCost}
        activeProjectCount={activeProjectCount}
        deadCostCount={deadCostCount}
        deadCostTotal={deadCostTotal}
        onDeadCostClick={handleDeadCostClick}
      />

      <CostBreakdown
        projects={filteredProjects}
        totalMonthlyCost={totalMonthlyCost}
      />

      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-1">
          {visibleTabs.map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setActiveFilter(filter)}
              className={`rounded-md px-2.5 py-1 font-mono text-xs transition-colors ${
                activeFilter === filter
                  ? filter === "dead-cost"
                    ? "bg-amber-950 text-amber-400"
                    : "bg-neutral-800 text-neutral-200"
                  : "text-neutral-600 hover:text-neutral-400"
              }`}
            >
              {FILTER_LABELS[filter]}
            </button>
          ))}
        </div>
        <Link
          href="/dashboard/projects/new"
          className="rounded-md bg-cyan-400 px-3 py-1.5 font-mono text-xs font-medium text-neutral-950 transition-colors hover:bg-cyan-300"
        >
          + new
        </Link>
      </div>

      {filteredProjects.length === 0 ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <div className="text-center">
            {projects.length === 0 ? (
              <>
                <p className="font-mono text-sm text-neutral-500">
                  no projects yet
                </p>
                <Link
                  href="/dashboard/projects/new"
                  className="mt-3 inline-block font-mono text-xs text-cyan-400 hover:text-cyan-300"
                >
                  create your first project →
                </Link>
              </>
            ) : activeFilter === "dead-cost" ? (
              <p className="font-mono text-sm text-neutral-500">
                no dead-cost projects — nice
              </p>
            ) : (
              <p className="font-mono text-sm text-neutral-500">
                no {FILTER_LABELS[activeFilter]} projects
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="divide-y divide-neutral-800/40">
          {filteredProjects.map((project) => (
            <ProjectCard
              key={project.id}
              id={project.id}
              name={project.name}
              description={project.description}
              status={project.status}
              stack={project.stack}
              monthly_cost={project.monthly_cost}
              updated_at={project.updated_at}
            />
          ))}
        </div>
      )}
    </>
  );
}
