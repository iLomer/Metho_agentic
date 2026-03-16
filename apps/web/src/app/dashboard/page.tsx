import { createServerClient } from "@/lib/supabase/server";
import { DashboardContent } from "@/components/dashboard-content";

/**
 * Dashboard page showing the user's project shelf.
 *
 * Auth is enforced by the middleware and the dashboard layout.
 * Fetches the user's projects server-side and passes them to the
 * client component for filtering and cost recalculation.
 */
export default async function DashboardPage() {
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, description, stack, monthly_cost, status, updated_at")
    .eq("user_id", user?.id ?? "")
    .order("updated_at", { ascending: false });

  const projectList = projects ?? [];

  return (
    <main className="mx-auto max-w-4xl px-4 py-6">
      <DashboardContent projects={projectList} />
    </main>
  );
}
