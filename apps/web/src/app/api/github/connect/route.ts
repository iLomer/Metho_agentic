import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

/**
 * Initiates GitHub OAuth flow.
 * Redirects to GitHub's authorize endpoint with the required scopes.
 */
export async function GET() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"));
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "GitHub OAuth not configured" }, { status: 500 });
  }

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/github/callback`;
  const scope = "repo read:user";
  const state = user.id; // Use user ID as state for CSRF protection

  const githubAuthUrl = new URL("https://github.com/login/oauth/authorize");
  githubAuthUrl.searchParams.set("client_id", clientId);
  githubAuthUrl.searchParams.set("redirect_uri", redirectUri);
  githubAuthUrl.searchParams.set("scope", scope);
  githubAuthUrl.searchParams.set("state", state);

  return NextResponse.redirect(githubAuthUrl.toString());
}
