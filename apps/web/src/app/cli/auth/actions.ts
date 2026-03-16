"use server";

import { createServerClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export interface ApproveDeviceState {
  error: string | null;
  success: boolean;
}

/**
 * Server action to approve a CLI device code.
 *
 * Looks up the user_code, verifies it exists and is not expired,
 * then sets approved=true and user_id on the device code row.
 */
export async function approveDeviceCode(
  _prev: ApproveDeviceState,
  formData: FormData,
): Promise<ApproveDeviceState> {
  const rawCode = formData.get("user_code");
  if (typeof rawCode !== "string" || rawCode.trim().length === 0) {
    return { error: "please enter a code", success: false };
  }

  // Normalize: uppercase, strip spaces, ensure dash in middle
  let userCode = rawCode.trim().toUpperCase().replace(/\s+/g, "");
  if (userCode.length === 8 && !userCode.includes("-")) {
    userCode = `${userCode.slice(0, 4)}-${userCode.slice(4)}`;
  }

  // Validate format: XXXX-XXXX
  if (!/^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(userCode)) {
    return { error: "invalid code format — expected XXXX-XXXX", success: false };
  }

  // Get the authenticated user
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "not authenticated", success: false };
  }

  // Use service client to bypass RLS for update
  const serviceClient = createServiceClient();

  // Look up the device code
  const { data: deviceRow, error: lookupError } = await serviceClient
    .from("cli_device_codes")
    .select("id, expires_at, approved")
    .eq("user_code", userCode)
    .single();

  if (lookupError || !deviceRow) {
    return { error: "code not found — check your terminal and try again", success: false };
  }

  if (new Date(deviceRow.expires_at) <= new Date()) {
    return { error: "code expired — run the auth command again in your terminal", success: false };
  }

  if (deviceRow.approved) {
    return { error: "code already approved", success: false };
  }

  // Approve the device code
  const { error: updateError } = await serviceClient
    .from("cli_device_codes")
    .update({ approved: true, user_id: user.id })
    .eq("id", deviceRow.id);

  if (updateError) {
    return { error: "failed to approve — please try again", success: false };
  }

  return { error: null, success: true };
}
