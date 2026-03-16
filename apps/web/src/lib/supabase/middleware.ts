import { createServerClient as createSupabaseServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import type { Database } from "@/types/database";

/**
 * Creates a Supabase client suitable for use inside Next.js middleware.
 *
 * Unlike the server client (which uses the cookies() API from next/headers),
 * middleware must read/write cookies through the NextRequest/NextResponse pair.
 *
 * Returns both the typed Supabase client and the response (which may carry
 * updated auth cookies that must be forwarded to the browser).
 */
export function createMiddlewareClient(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createSupabaseServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          supabaseResponse = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            supabaseResponse.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  return { supabase, response: supabaseResponse };
}
