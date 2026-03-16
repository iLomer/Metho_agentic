import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { DashboardNav } from "@/components/dashboard-nav";

/**
 * Shared layout for all `/dashboard/*` routes.
 *
 * Fetches the current user and renders a top navigation bar with the
 * user's display name (or email) and a logout button. Redirects to
 * `/login` if no authenticated user is found (belt-and-suspenders —
 * the middleware should already handle this).
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const displayName =
    user.user_metadata?.full_name ??
    user.user_metadata?.name ??
    user.email ??
    "User";

  return (
    <div className="min-h-screen">
      <DashboardNav displayName={displayName} />
      {children}
    </div>
  );
}
