import { NextResponse } from "next/server";
import { randomBytes, createHash } from "node:crypto";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * POST /api/cli/auth/token
 *
 * Polls for device code approval and exchanges an approved device code
 * for a long-lived CLI access token.
 *
 * Request body: { device_code: string }
 *
 * Responses:
 * - 200 { access_token } — approved, token issued
 * - 403 { error: "authorization_pending" } — not yet approved
 * - 410 { error: "expired_or_invalid" } — expired or not found
 * - 400 { error: "missing_device_code" } — bad request
 *
 * No authentication required (the device_code acts as the auth).
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "missing_device_code" },
      { status: 400 },
    );
  }

  const deviceCode =
    typeof body === "object" &&
    body !== null &&
    "device_code" in body &&
    typeof (body as Record<string, unknown>).device_code === "string"
      ? (body as Record<string, unknown>).device_code as string
      : null;

  if (!deviceCode) {
    return NextResponse.json(
      { error: "missing_device_code" },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();

  // Look up the device code
  const { data: deviceRow, error: lookupError } = await supabase
    .from("cli_device_codes")
    .select("id, device_code, user_id, expires_at, approved")
    .eq("device_code", deviceCode)
    .single();

  if (lookupError || !deviceRow) {
    return NextResponse.json(
      { error: "expired_or_invalid" },
      { status: 410 },
    );
  }

  // Check expiry
  if (new Date(deviceRow.expires_at) <= new Date()) {
    // Clean up expired code
    await supabase
      .from("cli_device_codes")
      .delete()
      .eq("id", deviceRow.id);

    return NextResponse.json(
      { error: "expired_or_invalid" },
      { status: 410 },
    );
  }

  // Check approval
  if (!deviceRow.approved || !deviceRow.user_id) {
    return NextResponse.json(
      { error: "authorization_pending" },
      { status: 403 },
    );
  }

  // Approved — generate token
  const plaintextToken = randomBytes(32).toString("hex"); // 64-char hex
  const tokenHash = createHash("sha256").update(plaintextToken).digest("hex");

  // Store the hashed token
  const { error: tokenError } = await supabase.from("cli_tokens").insert({
    user_id: deviceRow.user_id,
    token_hash: tokenHash,
  });

  if (tokenError) {
    return NextResponse.json(
      { error: "failed_to_create_token" },
      { status: 500 },
    );
  }

  // Delete the used device code
  await supabase
    .from("cli_device_codes")
    .delete()
    .eq("id", deviceRow.id);

  return NextResponse.json({ access_token: plaintextToken });
}
