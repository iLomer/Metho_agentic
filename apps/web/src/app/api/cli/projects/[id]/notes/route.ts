import { NextResponse } from "next/server";
import { validateCliToken } from "@/lib/cli-auth";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * POST /api/cli/projects/[id]/notes
 *
 * Appends content to the project's notes field with a newline separator.
 * If notes are currently empty/null, sets the content directly.
 *
 * Requires: Bearer token in Authorization header.
 * Body: { content: string }
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

  const { content } = body as { content?: string };

  if (
    !content ||
    typeof content !== "string" ||
    content.trim().length === 0
  ) {
    return NextResponse.json(
      { error: "missing_required_field", field: "content" },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();

  // Fetch project with ownership check
  const { data: project, error: fetchError } = await supabase
    .from("projects")
    .select("id, notes")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (fetchError || !project) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const existingNotes =
    typeof project.notes === "string" ? project.notes : "";
  const updatedNotes = existingNotes
    ? `${existingNotes}\n${content.trim()}`
    : content.trim();

  const { error: updateError } = await supabase
    .from("projects")
    .update({ notes: updatedNotes })
    .eq("id", id)
    .eq("user_id", userId);

  if (updateError) {
    return NextResponse.json(
      { error: "update_failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({ notes: updatedNotes });
}
