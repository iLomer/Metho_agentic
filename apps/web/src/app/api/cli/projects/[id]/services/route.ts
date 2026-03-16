import { NextResponse } from "next/server";
import { validateCliToken } from "@/lib/cli-auth";
import { createServiceClient } from "@/lib/supabase/service";
import type { ConnectedService } from "@/types/database";

/**
 * POST /api/cli/projects/[id]/services
 *
 * Appends or updates a connected service on the project.
 * If a service with the same name exists, updates its cost.
 * Recalculates the project's monthly_cost as the sum of all service costs.
 *
 * Requires: Bearer token in Authorization header.
 * Body: { name: string, monthly_cost?: number }
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

  const { name, monthly_cost } = body as {
    name?: string;
    monthly_cost?: number;
  };

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json(
      { error: "missing_required_field", field: "name" },
      { status: 400 },
    );
  }

  const serviceCost =
    typeof monthly_cost === "number" ? monthly_cost : 0;

  const supabase = createServiceClient();

  // Fetch project with ownership check
  const { data: project, error: fetchError } = await supabase
    .from("projects")
    .select("id, connected_services")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (fetchError || !project) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const services: ConnectedService[] = Array.isArray(
    project.connected_services,
  )
    ? (project.connected_services as ConnectedService[])
    : [];

  // Upsert: update existing service by name, or append
  const existingIndex = services.findIndex(
    (s) => s.name.toLowerCase() === name.trim().toLowerCase(),
  );

  if (existingIndex >= 0) {
    const existing = services[existingIndex];
    if (existing) {
      services[existingIndex] = {
        name: existing.name,
        url: existing.url,
        monthly_cost: serviceCost,
      };
    }
  } else {
    services.push({ name: name.trim(), monthly_cost: serviceCost });
  }

  // Recalculate total monthly cost
  const totalMonthlyCost = services.reduce(
    (sum, s) => sum + (s.monthly_cost ?? 0),
    0,
  );

  const { error: updateError } = await supabase
    .from("projects")
    .update({
      connected_services: services,
      monthly_cost: totalMonthlyCost,
    })
    .eq("id", id)
    .eq("user_id", userId);

  if (updateError) {
    return NextResponse.json(
      { error: "update_failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({ connected_services: services });
}
