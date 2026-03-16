import { type NextRequest, NextResponse } from "next/server";
import { createServerClient as createSupabaseServerClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

/**
 * Auth callback route.
 *
 * After Google OAuth, Supabase redirects here with a `code` query parameter.
 * We exchange that code for a session, writing cookies into the response
 * so the browser picks them up on the redirect.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const redirectTo = request.nextUrl.clone();

  if (code) {
    const redirect = request.cookies.get("auth_redirect")?.value ?? null;
    const isLocalPath = redirect !== null && redirect.startsWith("/") && !redirect.startsWith("//");
    redirectTo.searchParams.delete("code");
    if (isLocalPath) {
      const [pathname, query] = redirect.split("?");
      redirectTo.pathname = pathname ?? "/dashboard";
      if (query) {
        for (const param of new URLSearchParams(query)) {
          redirectTo.searchParams.set(param[0], param[1]);
        }
      }
    } else {
      redirectTo.pathname = "/dashboard";
    }

    const response = NextResponse.redirect(redirectTo);

    const supabase = createSupabaseServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            for (const { name, value, options } of cookiesToSet) {
              response.cookies.set(name, value, options);
            }
          },
        },
      },
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      if (isLocalPath) {
        response.cookies.set("auth_redirect", "", { path: "/", maxAge: 0 });
      }
      return response;
    }
  }

  redirectTo.pathname = "/login";
  redirectTo.searchParams.delete("code");
  return NextResponse.redirect(redirectTo);
}
