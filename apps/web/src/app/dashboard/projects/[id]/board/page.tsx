import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { readBoard } from "@/lib/github";
import { BoardClient } from "./board-client";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function BoardPage({ params }: PageProps) {
  const { id } = await params;

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  // Get project with linked repo
  const { data: project } = await supabase
    .from("projects")
    .select("id, name, github_repo_full_name")
    .eq("id", id)
    .single();

  if (!project) {
    notFound();
  }

  if (!project.github_repo_full_name) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="flex min-h-[40vh] items-center justify-center">
          <p className="font-mono text-sm text-neutral-500">
            no github repo linked — go to project settings to connect one
          </p>
        </div>
      </main>
    );
  }

  // Get GitHub token
  const serviceClient = createServiceClient();
  const { data: connection } = await serviceClient
    .from("github_connections")
    .select("access_token")
    .eq("user_id", user.id)
    .single();

  if (!connection) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="flex min-h-[40vh] items-center justify-center">
          <p className="font-mono text-sm text-neutral-500">
            connect github in settings to view the board
          </p>
        </div>
      </main>
    );
  }

  const [owner, repo] = project.github_repo_full_name.split("/");

  if (!owner || !repo) {
    notFound();
  }

  const { tasks, summary } = await readBoard(connection.access_token, owner, repo);

  // Cache board summary in project
  await supabase
    .from("projects")
    .update({ board_summary: summary })
    .eq("id", id);

  return <BoardClient projectName={project.name} projectId={id} tasks={tasks} summary={summary} />;
}
