import { createHash } from "node:crypto";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Validates a CLI token from the request headers.
 *
 * The CLI sends tokens base64-encoded in the X-Buildrack-Token header.
 * Base64 encoding is required because Vercel's edge proxy strips header
 * values that look like raw hex secrets.
 *
 * Accepts both base64-encoded and plain tokens for flexibility.
 * Falls back to Authorization: Bearer for non-Vercel environments.
 *
 * Hashes the decoded token with SHA-256, looks up the hash in cli_tokens,
 * and returns the associated user_id. Updates last_used_at on success.
 *
 * Returns null if the token is missing, malformed, or not found.
 */
export async function validateCliToken(
  request: Request,
): Promise<string | null> {
  let rawValue = request.headers.get("x-buildrack-token");

  // Fall back to Authorization: Bearer for non-Vercel environments
  if (!rawValue) {
    const authHeader = request.headers.get("authorization");
    if (authHeader) {
      const match = authHeader.match(/^Bearer\s+(.+)$/i);
      rawValue = match?.[1] ?? null;
    }
  }

  if (!rawValue) {
    return null;
  }

  // Decode base64 if the value looks base64-encoded (contains = padding or
  // is not a valid 64-char hex string). Plain hex tokens are accepted too.
  let plainToken: string;
  const isPlainHex = /^[a-f0-9]{64}$/i.test(rawValue);
  if (isPlainHex) {
    plainToken = rawValue;
  } else {
    try {
      plainToken = Buffer.from(rawValue, "base64").toString("utf-8");
    } catch {
      return null;
    }
  }

  if (!plainToken || !/^[a-f0-9]{64}$/i.test(plainToken)) {
    return null;
  }

  const tokenHash = createHash("sha256").update(plainToken).digest("hex");

  const supabase = createServiceClient();

  // Look up the hashed token
  const { data: tokenRow, error: lookupError } = await supabase
    .from("cli_tokens")
    .select("id, user_id")
    .eq("token_hash", tokenHash)
    .single();

  if (lookupError || !tokenRow) {
    return null;
  }

  // Update last_used_at (fire-and-forget is fine here)
  await supabase
    .from("cli_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", tokenRow.id);

  return tokenRow.user_id;
}
