"use client";

import Image from "next/image";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/client";

function LoginContent() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect");

  async function handleGoogleSignIn() {
    const supabase = createBrowserClient();

    if (redirect) {
      document.cookie = `auth_redirect=${redirect}; path=/; max-age=300; SameSite=Lax`;
    }

    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-xs space-y-6">
        <div className="flex flex-col items-center gap-3">
          <Image src="/Buildrack.png" alt="Meto" width={40} height={40} className="rounded-md" />
          <h1 className="font-mono text-lg font-medium">sign in</h1>
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          className="flex w-full items-center justify-center gap-2.5 rounded-md border border-neutral-800 bg-neutral-900 px-4 py-2.5 font-mono text-xs font-medium text-neutral-200 transition-colors hover:border-neutral-600 hover:bg-neutral-800"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          continue with google
        </button>

        <p className="text-center font-mono text-[10px] text-neutral-700">
          no account needed — uses your google profile
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
