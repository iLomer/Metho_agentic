import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

interface GitHubRepo {
  id: number;
  full_name: string;
  name: string;
  private: boolean;
  html_url: string;
  description: string | null;
  default_branch: string;
  updated_at: string;
}

/**
 * Lists the user's GitHub repos.
 * For each repo, checks if it has meto methodology files (CLAUDE.md + ai/ folder).
 */
export async function GET() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get the GitHub connection
  const serviceClient = createServiceClient();
  const { data: connection } = await serviceClient
    .from("github_connections")
    .select("access_token, github_username")
    .eq("user_id", user.id)
    .single();

  if (!connection) {
    return NextResponse.json({ error: "GitHub not connected" }, { status: 400 });
  }

  // Fetch repos from GitHub (up to 100, sorted by recently pushed)
  const response = await fetch(
    "https://api.github.com/user/repos?sort=pushed&per_page=100&type=owner",
    {
      headers: {
        Authorization: `Bearer ${connection.access_token}`,
        Accept: "application/vnd.github.v3+json",
      },
    },
  );

  if (!response.ok) {
    return NextResponse.json({ error: "Failed to fetch repos from GitHub" }, { status: 502 });
  }

  const repos = await response.json() as GitHubRepo[];

  return NextResponse.json({
    repos: repos.map((repo) => ({
      id: repo.id,
      full_name: repo.full_name,
      name: repo.name,
      private: repo.private,
      html_url: repo.html_url,
      description: repo.description,
      default_branch: repo.default_branch,
      updated_at: repo.updated_at,
    })),
    github_username: connection.github_username,
  });
}
