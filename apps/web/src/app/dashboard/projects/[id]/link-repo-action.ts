"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { hasMeToMethodology, checkHealth } from "@/lib/github";

export interface LinkRepoState {
  error: string | null;
  success: boolean;
}

/**
 * Links a GitHub repo to a project.
 * Checks for meto methodology and runs an initial health check.
 */
export async function linkRepo(
  _prevState: LinkRepoState,
  formData: FormData,
): Promise<LinkRepoState> {
  const projectId = formData.get("project_id")?.toString().trim() ?? "";
  const repoFullName = formData.get("repo_full_name")?.toString().trim() ?? "";

  if (!projectId || !repoFullName) {
    return { error: "Missing project ID or repo name.", success: false };
  }

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in.", success: false };
  }

  // Get GitHub token
  const serviceClient = createServiceClient();
  const { data: connection } = await serviceClient
    .from("github_connections")
    .select("access_token")
    .eq("user_id", user.id)
    .single();

  if (!connection) {
    return { error: "GitHub not connected. Go to settings.", success: false };
  }

  const [owner, repo] = repoFullName.split("/");
  if (!owner || !repo) {
    return { error: "Invalid repo name.", success: false };
  }

  // Check for meto methodology
  const hasMeto = await hasMeToMethodology(connection.access_token, owner, repo);

  // Run health check
  const health = await checkHealth(connection.access_token, owner, repo);

  // Update project
  const { error } = await supabase
    .from("projects")
    .update({
      github_repo_full_name: repoFullName,
      has_meto_methodology: hasMeto,
      last_health_score: health.score,
      last_health_check_at: new Date().toISOString(),
    })
    .eq("id", projectId)
    .eq("user_id", user.id);

  if (error) {
    return { error: "Failed to link repo.", success: false };
  }

  revalidatePath(`/dashboard/projects/${projectId}`);
  revalidatePath("/dashboard");

  return { error: null, success: true };
}
