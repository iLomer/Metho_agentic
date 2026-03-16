"use server";

import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";

/**
 * Signs the user out and redirects to the login page.
 */
export async function signOut() {
  const supabase = await createServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
