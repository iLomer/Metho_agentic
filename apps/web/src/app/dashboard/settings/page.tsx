import { createServerClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { SettingsClient } from "./settings-client";

export default async function SettingsPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Check if GitHub is connected
  const serviceClient = createServiceClient();
  const { data: connection } = await serviceClient
    .from("github_connections")
    .select("github_username, created_at")
    .eq("user_id", user.id)
    .single();

  return (
    <SettingsClient
      githubConnected={connection !== null}
      githubUsername={connection?.github_username ?? null}
      githubConnectedAt={connection?.created_at ?? null}
    />
  );
}
