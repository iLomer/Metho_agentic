"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import type { ConnectedService, ProjectUrls } from "@/types/database";

export interface FormState {
  errors: Record<string, string>;
  success: boolean;
}

/**
 * Server action to update an existing project.
 *
 * Validates form data (name required, costs must be numeric),
 * computes monthly_cost as the sum of connected service costs,
 * and updates the row in the projects table.
 *
 * The project ID is passed as a hidden field in the form.
 */
export async function updateProject(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const errors: Record<string, string> = {};

  const projectId = formData.get("project_id")?.toString().trim() ?? "";

  if (!projectId) {
    return {
      errors: { form: "Missing project ID." },
      success: false,
    };
  }

  // Extract basic fields
  const name = formData.get("name")?.toString().trim() ?? "";
  const description = formData.get("description")?.toString().trim() ?? "";
  const status = formData.get("status")?.toString().trim() ?? "active";
  const stackRaw = formData.get("stack")?.toString().trim() ?? "";
  const aiToolsRaw = formData.get("ai_tools")?.toString().trim() ?? "";
  const notes = formData.get("notes")?.toString().trim() ?? "";

  // Validate required fields
  if (!name) {
    errors.name = "Project name is required.";
  }

  // Parse stack and ai_tools as comma-separated arrays
  const stack = stackRaw
    ? stackRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
  const aiTools = aiToolsRaw
    ? aiToolsRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  // Parse URLs (key-value pairs)
  const urlKeys = formData.getAll("url_key");
  const urlValues = formData.getAll("url_value");
  const urls: ProjectUrls = {};

  for (let i = 0; i < urlKeys.length; i++) {
    const key = urlKeys[i]?.toString().trim();
    const value = urlValues[i]?.toString().trim();
    if (key && value) {
      urls[key] = value;
    }
  }

  // Parse connected services (name + monthly_cost pairs)
  const serviceNames = formData.getAll("service_name");
  const serviceCosts = formData.getAll("service_cost");
  const connectedServices: ConnectedService[] = [];
  let totalMonthlyCost = 0;

  for (let i = 0; i < serviceNames.length; i++) {
    const serviceName = serviceNames[i]?.toString().trim();
    const costRaw = serviceCosts[i]?.toString().trim();

    if (!serviceName && !costRaw) {
      continue;
    }

    if (serviceName && costRaw) {
      const cost = Number(costRaw);
      if (Number.isNaN(cost) || cost < 0) {
        errors[`service_cost_${String(i)}`] =
          `Cost for "${serviceName}" must be a valid non-negative number.`;
      } else {
        connectedServices.push({ name: serviceName, monthly_cost: cost });
        totalMonthlyCost += cost;
      }
    } else if (serviceName && !costRaw) {
      connectedServices.push({ name: serviceName, monthly_cost: 0 });
    } else if (!serviceName && costRaw) {
      errors[`service_name_${String(i)}`] =
        "Service name is required when a cost is provided.";
    }
  }

  // Return errors if any
  if (Object.keys(errors).length > 0) {
    return { errors, success: false };
  }

  // Update project
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      errors: { form: "You must be signed in to update a project." },
      success: false,
    };
  }

  const { error } = await supabase
    .from("projects")
    .update({
      name,
      description: description || null,
      status,
      stack,
      ai_tools: aiTools,
      urls,
      connected_services: connectedServices,
      monthly_cost: totalMonthlyCost,
      notes: notes || null,
    })
    .eq("id", projectId)
    .eq("user_id", user.id);

  if (error) {
    return {
      errors: { form: "Failed to update project. Please try again." },
      success: false,
    };
  }

  revalidatePath(`/dashboard/projects/${projectId}`);
  revalidatePath("/dashboard");

  return { errors: {}, success: true };
}

export interface DeleteState {
  error: string | null;
}

/**
 * Server action to delete a project.
 *
 * Deletes the row from the projects table. RLS ensures
 * only the owning user can delete their own projects.
 * On success, revalidates the dashboard and redirects there.
 */
export async function deleteProject(
  _prevState: DeleteState,
  formData: FormData,
): Promise<DeleteState> {
  const projectId = formData.get("project_id")?.toString().trim() ?? "";

  if (!projectId) {
    return { error: "Missing project ID." };
  }

  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in to delete a project." };
  }

  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", projectId)
    .eq("user_id", user.id);

  if (error) {
    return { error: "Failed to delete project. Please try again." };
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}
