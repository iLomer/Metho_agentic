import { createBrowserClient as createSupabaseBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

/**
 * Creates a typed Supabase client for use in browser (Client Components).
 *
 * Call this inside components or event handlers — never at module scope
 * so the client picks up the latest cookies on each invocation.
 */
export function createBrowserClient() {
  return createSupabaseBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
