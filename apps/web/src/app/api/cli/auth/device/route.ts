import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Characters allowed in user codes.
 * Excludes confusing characters: 0, O, I, 1, L
 */
const USER_CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/**
 * Generates a human-friendly user code formatted as XXXX-XXXX.
 * Uses only unambiguous uppercase alphanumeric characters.
 */
function generateUserCode(): string {
  const bytes = randomBytes(8);
  const chars: string[] = [];
  for (let i = 0; i < 8; i++) {
    const byte = bytes[i];
    if (byte === undefined) {
      throw new Error("Unexpected missing byte in randomBytes output");
    }
    chars.push(USER_CODE_CHARS[byte % USER_CODE_CHARS.length] ?? "A");
  }
  return `${chars.slice(0, 4).join("")}-${chars.slice(4, 8).join("")}`;
}

/**
 * POST /api/cli/auth/device
 *
 * Initiates the device authorization flow for the CLI.
 * Generates a device_code (secret, for polling) and a user_code
 * (human-readable, entered on the web app).
 *
 * No authentication required.
 */
export async function POST() {
  const supabase = createServiceClient();

  const deviceCode = randomBytes(32).toString("hex");
  const userCode = generateUserCode();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  const { error } = await supabase.from("cli_device_codes").insert({
    device_code: deviceCode,
    user_code: userCode,
    expires_at: expiresAt,
  });

  if (error) {
    return NextResponse.json(
      { error: "failed_to_create_device_code" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    device_code: deviceCode,
    user_code: userCode,
    verification_url: "/cli/auth",
    expires_in: 300,
    interval: 5,
  });
}
