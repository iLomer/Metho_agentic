import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Creates a Supabase client using the service role key.
 *
 * This client bypasses Row-Level Security and should only be used
 * in server-side code (API routes, server actions) where the caller
 * is not an authenticated user — e.g., the CLI device auth flow.
 *
 * Never import this in client components or expose the service role key.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables",
    );
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
