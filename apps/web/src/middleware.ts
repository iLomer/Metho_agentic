import { type NextRequest, NextResponse } from "next/server";
import { createMiddlewareClient } from "@/lib/supabase/middleware";

/**
 * Protects routes that require authentication.
 *
 * - `/dashboard` (and sub-paths) require a valid session.
 *   Unauthenticated visitors are redirected to `/login`.
 * - All other routes pass through after refreshing the auth session
 *   (important so cookies stay up-to-date).
 */
export async function middleware(request: NextRequest) {
  // CLI API endpoints use Bearer token auth — skip middleware entirely
  if (request.nextUrl.pathname.startsWith("/api/cli/")) {
    return NextResponse.next();
  }

  // If an auth code lands on any route other than /auth/callback or /api/github/callback, redirect it there
  const code = request.nextUrl.searchParams.get("code");
  if (
    code &&
    !request.nextUrl.pathname.startsWith("/auth/callback") &&
    !request.nextUrl.pathname.startsWith("/api/github/")
  ) {
    const callbackUrl = request.nextUrl.clone();
    callbackUrl.pathname = "/auth/callback";
    return Response.redirect(callbackUrl);
  }

  const { supabase, response } = createMiddlewareClient(request);

  // Refresh the session — this keeps auth cookies current.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isProtected =
    request.nextUrl.pathname.startsWith("/dashboard") ||
    request.nextUrl.pathname.startsWith("/cli/auth");

  if (isProtected && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    const redirectPath = request.nextUrl.search
      ? `${request.nextUrl.pathname}${request.nextUrl.search}`
      : request.nextUrl.pathname;
    loginUrl.searchParams.set("redirect", redirectPath);
    return Response.redirect(loginUrl);
  }

  // If user is logged in and visits / or /login, redirect appropriately
  if (user && (request.nextUrl.pathname === "/login" || request.nextUrl.pathname === "/")) {
    const redirect = request.nextUrl.searchParams.get("redirect");
    const isLocalPath = redirect !== null && redirect.startsWith("/") && !redirect.startsWith("//");
    const targetUrl = request.nextUrl.clone();
    targetUrl.search = "";
    if (isLocalPath) {
      const [pathname, query] = redirect.split("?");
      targetUrl.pathname = pathname ?? "/dashboard";
      if (query) {
        targetUrl.search = `?${query}`;
      }
    } else {
      targetUrl.pathname = "/dashboard";
    }
    return Response.redirect(targetUrl);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|api/cli/).*)",
  ],
};
