import { NextResponse } from "next/server";
import { validateCliToken } from "@/lib/cli-auth";
import { createServiceClient } from "@/lib/supabase/service";
import type { CliProjectResponse } from "@/types/cli";
import type { ConnectedService, ProjectUrls } from "@/types/database";

const VALID_STATUSES = new Set(["active", "paused", "archived"]);

const PROJECT_SELECT =
  "id, name, description, status, stack, ai_tools, connected_services, urls, monthly_cost, notes, is_public, slug, created_at, updated_at" as const;

/** Shape of the PATCH request body for updating a project. */
interface UpdateProjectBody {
  name?: string;
  description?: string;
  status?: string;
  stack?: string[];
  ai_tools?: string[];
  connected_services?: ConnectedService[];
  urls?: ProjectUrls;
  notes?: string;
}

/**
 * GET /api/cli/projects/[id]
 *
 * Returns a single project by ID, owned by the authenticated CLI user.
 * Returns 404 if the project does not exist or is not owned by the user.
 *
 * Requires: Bearer token in Authorization header.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await validateCliToken(request);
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const supabase = createServiceClient();

  const { data: project, error } = await supabase
    .from("projects")
    .select(PROJECT_SELECT)
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (error || !project) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const response: CliProjectResponse = project;

  return NextResponse.json(response);
}

/**
 * Merges incoming connected services with existing ones additively.
 *
 * - New services (by name) are appended.
 * - If a service with the same name already exists, its cost is updated.
 */
function mergeConnectedServices(
  existing: ConnectedService[],
  incoming: ConnectedService[],
): ConnectedService[] {
  const merged = new Map<string, ConnectedService>();

  for (const service of existing) {
    merged.set(service.name.toLowerCase(), { ...service });
  }

  for (const service of incoming) {
    const key = service.name.toLowerCase();
    const current = merged.get(key);
    if (current) {
      current.monthly_cost = service.monthly_cost ?? 0;
    } else {
      merged.set(key, {
        name: service.name.trim(),
        monthly_cost: typeof service.monthly_cost === "number" ? service.monthly_cost : 0,
      });
    }
  }

  return Array.from(merged.values());
}

/**
 * Merges incoming URLs with existing ones additively.
 *
 * - New keys are added.
 * - Existing keys are updated.
 * - No keys are removed.
 */
function mergeUrls(existing: ProjectUrls, incoming: ProjectUrls): ProjectUrls {
  return { ...existing, ...incoming };
}

/**
 * PATCH /api/cli/projects/[id]
 *
 * Updates an existing project owned by the authenticated CLI user.
 * Array fields (stack, ai_tools) are merged as a union.
 * connected_services are merged by name (append or update cost).
 * urls are merged additively (add new keys, update existing).
 * notes are appended with newline separator.
 *
 * Requires: Bearer token in Authorization header.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await validateCliToken(request);
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let body: UpdateProjectBody;
  try {
    body = (await request.json()) as UpdateProjectBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 },
    );
  }

  // Validate at least one field is provided
  const updateableKeys: (keyof UpdateProjectBody)[] = [
    "name",
    "description",
    "status",
    "stack",
    "ai_tools",
    "connected_services",
    "urls",
    "notes",
  ];
  const hasAtLeastOneField = updateableKeys.some(
    (key) => body[key] !== undefined,
  );

  if (!hasAtLeastOneField) {
    return NextResponse.json(
      { error: "At least one field must be provided for update." },
      { status: 400 },
    );
  }

  // Validate fields
  const errors: Record<string, string> = {};

  if (body.name !== undefined) {
    if (typeof body.name !== "string" || !body.name.trim()) {
      errors.name = "Project name must be a non-empty string.";
    }
  }

  if (
    body.status !== undefined &&
    (typeof body.status !== "string" || !VALID_STATUSES.has(body.status))
  ) {
    errors.status = "Status must be one of: active, paused, archived.";
  }

  if (Object.keys(errors).length > 0) {
    return NextResponse.json(
      { error: "validation_failed", details: errors },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();

  // Fetch existing project to merge additive fields
  const { data: existing, error: fetchError } = await supabase
    .from("projects")
    .select(PROJECT_SELECT)
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Build update payload
  const update: Record<string, unknown> = {};

  if (body.name !== undefined) {
    update.name = (body.name as string).trim();
  }

  if (body.description !== undefined) {
    update.description = String(body.description).trim() || null;
  }

  if (body.status !== undefined) {
    update.status = body.status;
  }

  // stack: union merge
  if (body.stack !== undefined && Array.isArray(body.stack)) {
    const incoming = body.stack.filter(
      (s): s is string => typeof s === "string" && s.trim() !== "",
    );
    const existingSet = new Set(
      (existing.stack as string[]).map((s) => s.toLowerCase()),
    );
    const merged = [...(existing.stack as string[])];
    for (const item of incoming) {
      if (!existingSet.has(item.toLowerCase())) {
        merged.push(item);
        existingSet.add(item.toLowerCase());
      }
    }
    update.stack = merged;
  }

  // ai_tools: union merge
  if (body.ai_tools !== undefined && Array.isArray(body.ai_tools)) {
    const incoming = body.ai_tools.filter(
      (s): s is string => typeof s === "string" && s.trim() !== "",
    );
    const existingSet = new Set(
      (existing.ai_tools as string[]).map((s) => s.toLowerCase()),
    );
    const merged = [...(existing.ai_tools as string[])];
    for (const item of incoming) {
      if (!existingSet.has(item.toLowerCase())) {
        merged.push(item);
        existingSet.add(item.toLowerCase());
      }
    }
    update.ai_tools = merged;
  }

  // connected_services: merge by name
  if (body.connected_services !== undefined && Array.isArray(body.connected_services)) {
    const validServices = body.connected_services.filter(
      (s): s is ConnectedService =>
        typeof s === "object" &&
        s !== null &&
        typeof s.name === "string" &&
        s.name.trim() !== "",
    );
    const mergedServices = mergeConnectedServices(
      existing.connected_services as ConnectedService[],
      validServices,
    );
    update.connected_services = mergedServices;
    // Recalculate monthly_cost
    update.monthly_cost = mergedServices.reduce(
      (sum, s) => sum + (s.monthly_cost ?? 0),
      0,
    );
  }

  // urls: additive merge
  if (body.urls !== undefined && typeof body.urls === "object" && body.urls !== null) {
    update.urls = mergeUrls(existing.urls as ProjectUrls, body.urls);
  }

  // notes: append with newline
  if (body.notes !== undefined) {
    const newNotes = String(body.notes).trim();
    if (newNotes) {
      const existingNotes = existing.notes as string | null;
      update.notes = existingNotes ? `${existingNotes}\n${newNotes}` : newNotes;
    }
  }

  // Only update if there are actual changes
  if (Object.keys(update).length === 0) {
    const response: CliProjectResponse = existing;
    return NextResponse.json(response);
  }

  const { data: updated, error: updateError } = await supabase
    .from("projects")
    .update(update)
    .eq("id", id)
    .eq("user_id", userId)
    .select(PROJECT_SELECT)
    .single();

  if (updateError || !updated) {
    return NextResponse.json(
      { error: "failed_to_update_project" },
      { status: 500 },
    );
  }

  const response: CliProjectResponse = updated;

  return NextResponse.json(response);
}
