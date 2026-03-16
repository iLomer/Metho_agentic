import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * GitHub OAuth callback.
 * Exchanges the authorization code for an access token,
 * fetches the GitHub user profile, and stores the connection in Supabase.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  if (!code) {
    return NextResponse.redirect(`${appUrl}/dashboard/settings?error=no_code`);
  }

  // Verify the user is authenticated
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${appUrl}/login`);
  }

  // Verify state matches user ID (CSRF protection)
  if (state !== user.id) {
    return NextResponse.redirect(`${appUrl}/dashboard/settings?error=invalid_state`);
  }

  // Exchange code for access token
  const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
    }),
  });

  const tokenText = await tokenResponse.text();
  process.stdout.write(`\n[GITHUB DEBUG] Status: ${tokenResponse.status}\n`);
  process.stdout.write(`[GITHUB DEBUG] Body: ${tokenText}\n\n`);

  let tokenData: { access_token?: string; token_type?: string; scope?: string; error?: string; error_description?: string };
  try {
    tokenData = JSON.parse(tokenText) as typeof tokenData;
  } catch {
    return NextResponse.redirect(`${appUrl}/dashboard/settings?error=invalid_response`);
  }

  if (!tokenData.access_token) {
    const reason = tokenData.error_description ?? tokenData.error ?? "unknown";
    return NextResponse.redirect(`${appUrl}/dashboard/settings?error=${encodeURIComponent(reason)}`);
  }

  // Fetch GitHub user profile
  const githubUserResponse = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      Accept: "application/vnd.github.v3+json",
    },
  });

  const githubUser = await githubUserResponse.json() as {
    id: number;
    login: string;
  };

  if (!githubUser.id || !githubUser.login) {
    return NextResponse.redirect(`${appUrl}/dashboard/settings?error=github_user_fetch_failed`);
  }

  // Store the GitHub connection using service client (bypasses RLS for upsert)
  const serviceClient = createServiceClient();

  const { error } = await serviceClient
    .from("github_connections")
    .upsert(
      {
        user_id: user.id,
        github_user_id: githubUser.id,
        github_username: githubUser.login,
        access_token: tokenData.access_token,
        scopes: tokenData.scope?.split(",") ?? [],
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

  if (error) {
    return NextResponse.redirect(`${appUrl}/dashboard/settings?error=db_save_failed`);
  }

  return NextResponse.redirect(`${appUrl}/dashboard/settings?github=connected`);
}
