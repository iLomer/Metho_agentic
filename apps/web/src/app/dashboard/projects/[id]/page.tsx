import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import type { ConnectedService, ProjectUrls } from "@/types/database";
import { ProjectDetailClient } from "./project-detail-client";
import { LinkRepoClient } from "./link-repo-client";

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * Project detail page.
 *
 * Fetches the project by ID. Returns 404 if not found or belongs to another user
 * (RLS handles ownership filtering automatically).
 */
export default async function ProjectDetailPage({ params }: PageProps) {
  const { id } = await params;

  const supabase = await createServerClient();

  const { data: project, error } = await supabase
    .from("projects")
    .select(
      "id, name, description, status, stack, ai_tools, urls, connected_services, monthly_cost, notes, github_repo_full_name, has_meto_methodology, last_health_score, created_at, updated_at",
    )
    .eq("id", id)
    .single();

  if (error || !project) {
    notFound();
  }

  return (
    <>
    <div className="mx-auto max-w-4xl px-4 pt-4">
      <LinkRepoClient projectId={project.id} currentRepo={project.github_repo_full_name ?? null} />
    </div>
    <ProjectDetailClient
      project={{
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status,
        stack: project.stack,
        ai_tools: project.ai_tools,
        urls: project.urls as ProjectUrls,
        connected_services: project.connected_services as ConnectedService[],
        monthly_cost: project.monthly_cost,
        notes: project.notes,
        github_repo_full_name: project.github_repo_full_name ?? null,
        has_meto_methodology: project.has_meto_methodology ?? false,
        last_health_score: project.last_health_score ?? null,
        created_at: project.created_at,
        updated_at: project.updated_at,
      }}
    />
    </>
  );
}
