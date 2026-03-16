import { createServerClient as createSupabaseServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";

/**
 * Creates a typed Supabase client for use in Server Components,
 * Server Actions, and Route Handlers.
 *
 * Must be called inside an async request context where `cookies()` is available.
 */
export async function createServerClient() {
  const cookieStore = await cookies();

  return createSupabaseServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            try {
              cookieStore.set(name, value, options);
            } catch {
              // `setAll` can be called from Server Components where
              // setting cookies is not possible. The middleware will
              // refresh the session on the next request.
            }
          }
        },
      },
    },
  );
}
