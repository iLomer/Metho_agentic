import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { readBoard } from "@/lib/github";

interface RouteParams {
  params: Promise<{ owner: string; repo: string }>;
}

/**
 * Reads the kanban board from a GitHub repo's ai/tasks/ directory.
 * Returns tasks and a summary of counts per column.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { owner, repo } = await params;

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const serviceClient = createServiceClient();
  const { data: connection } = await serviceClient
    .from("github_connections")
    .select("access_token")
    .eq("user_id", user.id)
    .single();

  if (!connection) {
    return NextResponse.json({ error: "GitHub not connected" }, { status: 400 });
  }

  const { tasks, summary } = await readBoard(connection.access_token, owner, repo);

  return NextResponse.json({ tasks, summary });
}
