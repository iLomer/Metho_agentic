import { NextResponse } from "next/server";
import { validateCliToken } from "@/lib/cli-auth";
import { createServiceClient } from "@/lib/supabase/service";
import type { ProjectUrls } from "@/types/database";

/**
 * POST /api/cli/projects/[id]/urls
 *
 * Adds or updates a URL entry in the project's urls JSONB object.
 * The label becomes the key and the url becomes the value.
 *
 * Requires: Bearer token in Authorization header.
 * Body: { label: string, url: string }
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

  const { label, url } = body as { label?: string; url?: string };

  if (
    !label ||
    typeof label !== "string" ||
    label.trim().length === 0
  ) {
    return NextResponse.json(
      { error: "missing_required_field", field: "label" },
      { status: 400 },
    );
  }

  if (!url || typeof url !== "string" || url.trim().length === 0) {
    return NextResponse.json(
      { error: "missing_required_field", field: "url" },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();

  // Fetch project with ownership check
  const { data: project, error: fetchError } = await supabase
    .from("projects")
    .select("id, urls")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (fetchError || !project) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const urls: ProjectUrls =
    project.urls && typeof project.urls === "object"
      ? (project.urls as ProjectUrls)
      : {};

  // Add or update the URL under the given label key
  urls[label.trim()] = url.trim();

  const { error: updateError } = await supabase
    .from("projects")
    .update({ urls })
    .eq("id", id)
    .eq("user_id", userId);

  if (updateError) {
    return NextResponse.json(
      { error: "update_failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({ urls });
}
