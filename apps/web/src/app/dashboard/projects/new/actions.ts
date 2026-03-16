"use server";

import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import type { ConnectedService, ProjectUrls } from "@/types/database";

export interface FormState {
  errors: Record<string, string>;
  success: boolean;
}

/**
 * Server action to create a new project.
 *
 * Validates form data (name required, costs must be numeric),
 * computes monthly_cost as the sum of connected service costs,
 * and inserts a row into the projects table.
 */
export async function createProject(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const errors: Record<string, string> = {};

  // Extract basic fields
  const name = formData.get("name")?.toString().trim() ?? "";
  const description = formData.get("description")?.toString().trim() ?? "";
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

  // Insert project
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      errors: { form: "You must be signed in to create a project." },
      success: false,
    };
  }

  const { error } = await supabase.from("projects").insert({
    user_id: user.id,
    name,
    description: description || null,
    stack,
    ai_tools: aiTools,
    urls,
    connected_services: connectedServices,
    monthly_cost: totalMonthlyCost,
    notes: notes || null,
  });

  if (error) {
    return {
      errors: { form: "Failed to create project. Please try again." },
      success: false,
    };
  }

  redirect("/dashboard");
}
