import { createServerClient } from "@/lib/supabase/server";
import { AgentsClient } from "./agents-client";

export default async function AgentsPage() {
  const supabase = await createServerClient();

  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, github_repo_full_name, has_meto_methodology")
    .order("updated_at", { ascending: false });

  // Only show projects that have a local path hint or meto methodology
  const projectList = (projects ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    repo: p.github_repo_full_name,
    hasMeto: p.has_meto_methodology,
  }));

  return <AgentsClient projects={projectList} />;
}
