import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { CliAuthForm } from "./cli-auth-form";

/**
 * /cli/auth — Device authorization approval page.
 *
 * Authenticated users land here after running `buildrack login` in the CLI.
 * They enter the user_code displayed in their terminal to approve the session.
 */
export default async function CliAuthPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="space-y-2 text-center">
          <h1 className="font-mono text-2xl font-bold tracking-tight text-neutral-100">
            authorize cli
          </h1>
          <p className="font-mono text-sm text-neutral-400">
            enter the code from your terminal to connect your cli session
          </p>
        </div>
        <Suspense>
          <CliAuthForm />
        </Suspense>
      </div>
    </div>
  );
}
