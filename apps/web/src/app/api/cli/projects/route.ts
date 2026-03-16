import { NextResponse } from "next/server";
import { validateCliToken } from "@/lib/cli-auth";
import { createServiceClient } from "@/lib/supabase/service";
import type { CliProjectResponse } from "@/types/cli";
import type { ConnectedService, ProjectUrls } from "@/types/database";

const VALID_STATUSES = new Set(["active", "paused", "archived"]);

const PROJECT_SELECT =
  "id, name, description, status, stack, ai_tools, connected_services, urls, monthly_cost, notes, is_public, slug, created_at, updated_at" as const;

/**
 * Generates a URL-safe slug from a project name.
 *
 * Converts to lowercase, replaces non-alphanumeric characters with hyphens,
 * collapses consecutive hyphens, and trims leading/trailing hyphens.
 */
function generateSlugBase(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "project"
  );
}

/**
 * Finds a unique slug by appending a numeric suffix if needed.
 */
async function findUniqueSlug(
  supabase: ReturnType<typeof createServiceClient>,
  base: string,
  excludeProjectId?: string,
): Promise<string> {
  let query = supabase
    .from("projects")
    .select("slug")
    .like("slug", `${base}%`);

  if (excludeProjectId) {
    query = query.neq("id", excludeProjectId);
  }

  const { data: existing } = await query;

  const takenSlugs = new Set(
    (existing ?? []).map((row) => row.slug).filter(Boolean),
  );

  if (!takenSlugs.has(base)) {
    return base;
  }

  let suffix = 2;
  while (takenSlugs.has(`${base}-${String(suffix)}`)) {
    suffix++;
  }
  return `${base}-${String(suffix)}`;
}

/** Shape of the POST request body for creating a project. */
interface CreateProjectBody {
  name?: string;
  description?: string;
  status?: string;
  stack?: string[];
  ai_tools?: string[];
  connected_services?: ConnectedService[];
  urls?: ProjectUrls;
  monthly_cost?: number;
  notes?: string;
}

/**
 * GET /api/cli/projects
 *
 * Returns all projects owned by the authenticated CLI user,
 * ordered by updated_at descending.
 *
 * Requires: Bearer token in Authorization header.
 */
export async function GET(request: Request) {
  const userId = await validateCliToken(request);
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  const { data: projects, error } = await supabase
    .from("projects")
    .select(PROJECT_SELECT)
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: "failed_to_fetch_projects" },
      { status: 500 },
    );
  }

  const response: CliProjectResponse[] = projects;

  return NextResponse.json(response);
}

/**
 * POST /api/cli/projects
 *
 * Creates a new project for the authenticated CLI user.
 * Requires: Bearer token in Authorization header.
 * Body: { name (required), description, status, stack[], ai_tools[],
 *         connected_services[], urls, monthly_cost, notes }
 */
export async function POST(request: Request) {
  const userId = await validateCliToken(request);
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: CreateProjectBody;
  try {
    body = (await request.json()) as CreateProjectBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 },
    );
  }

  // Validate required fields
  const errors: Record<string, string> = {};

  if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
    errors.name = "Project name is required and must be a non-empty string.";
  }

  if (
    body.status !== undefined &&
    (typeof body.status !== "string" || !VALID_STATUSES.has(body.status))
  ) {
    errors.status = "Status must be one of: active, paused, archived.";
  }

  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ error: "validation_failed", details: errors }, { status: 400 });
  }

  const name = (body.name as string).trim();
  const description =
    body.description !== undefined ? String(body.description).trim() || null : null;
  const status = body.status ?? "active";
  const stack = Array.isArray(body.stack)
    ? body.stack.filter((s): s is string => typeof s === "string" && s.trim() !== "")
    : [];
  const aiTools = Array.isArray(body.ai_tools)
    ? body.ai_tools.filter((s): s is string => typeof s === "string" && s.trim() !== "")
    : [];
  const connectedServices: ConnectedService[] = Array.isArray(body.connected_services)
    ? body.connected_services
        .filter(
          (s): s is ConnectedService =>
            typeof s === "object" &&
            s !== null &&
            typeof s.name === "string" &&
            s.name.trim() !== "",
        )
        .map((s) => ({
          name: s.name.trim(),
          monthly_cost: typeof s.monthly_cost === "number" ? s.monthly_cost : 0,
        }))
    : [];
  const urls: ProjectUrls =
    body.urls !== undefined && typeof body.urls === "object" && body.urls !== null
      ? body.urls
      : {};
  const notes =
    body.notes !== undefined ? String(body.notes).trim() || null : null;

  // Calculate monthly cost from connected services
  const monthlyCost = connectedServices.reduce(
    (sum, s) => sum + (s.monthly_cost ?? 0),
    0,
  );

  // Generate slug
  const supabase = createServiceClient();
  const slugBase = generateSlugBase(name);
  const slug = await findUniqueSlug(supabase, slugBase);

  const { data: project, error } = await supabase
    .from("projects")
    .insert({
      user_id: userId,
      name,
      description,
      status,
      stack,
      ai_tools: aiTools,
      connected_services: connectedServices,
      urls,
      monthly_cost: monthlyCost,
      notes,
      slug,
    })
    .select(PROJECT_SELECT)
    .single();

  if (error || !project) {
    return NextResponse.json(
      { error: "failed_to_create_project" },
      { status: 500 },
    );
  }

  const response: CliProjectResponse = project;

  return NextResponse.json(response, { status: 201 });
}
