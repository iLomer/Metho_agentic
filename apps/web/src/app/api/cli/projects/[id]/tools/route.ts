import { NextResponse } from "next/server";
import { validateCliToken } from "@/lib/cli-auth";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * POST /api/cli/projects/[id]/tools
 *
 * Appends an AI tool to the project's ai_tools array.
 * Deduplicates by case-insensitive comparison.
 *
 * Requires: Bearer token in Authorization header.
 * Body: { name: string }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await validateCliToken(request);
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "invalid_json" },
      { status: 400 },
    );
  }

  const { name } = body as { name?: string };

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json(
      { error: "missing_required_field", field: "name" },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();

  // Fetch project with ownership check
  const { data: project, error: fetchError } = await supabase
    .from("projects")
    .select("id, ai_tools")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (fetchError || !project) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const tools: string[] = Array.isArray(project.ai_tools)
    ? (project.ai_tools as string[])
    : [];

  // Deduplicate by case-insensitive comparison
  const trimmedName = name.trim();
  const alreadyExists = tools.some(
    (t) => t.toLowerCase() === trimmedName.toLowerCase(),
  );

  if (!alreadyExists) {
    tools.push(trimmedName);
  }

  const { error: updateError } = await supabase
    .from("projects")
    .update({ ai_tools: tools })
    .eq("id", id)
    .eq("user_id", userId);

  if (updateError) {
    return NextResponse.json(
      { error: "update_failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ai_tools: tools });
}
