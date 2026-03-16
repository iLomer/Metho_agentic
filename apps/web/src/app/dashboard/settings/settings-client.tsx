"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

interface SettingsClientProps {
  githubConnected: boolean;
  githubUsername: string | null;
  githubConnectedAt: string | null;
}

function SettingsContent({ githubConnected, githubUsername, githubConnectedAt }: SettingsClientProps) {
  const searchParams = useSearchParams();
  const githubStatus = searchParams.get("github");
  const error = searchParams.get("error");

  return (
    <main className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-5 flex items-center justify-between">
        <Link
          href="/dashboard"
          className="font-mono text-xs text-neutral-600 hover:text-neutral-400"
        >
          &larr; dashboard
        </Link>
        <h1 className="font-mono text-sm text-neutral-300">settings</h1>
      </div>

      {githubStatus === "connected" && (
        <div className="mb-4 border border-green-900 bg-green-950/50 px-3 py-2 font-mono text-xs text-green-400">
          GitHub connected successfully
        </div>
      )}

      {error && (
        <div className="mb-4 border border-red-900 bg-red-950/50 px-3 py-2 font-mono text-xs text-red-400">
          Failed to connect GitHub: {error}
        </div>
      )}

      {/* GitHub Connection */}
      <div className="border border-neutral-800 p-4">
        <h2 className="font-mono text-xs text-neutral-300">github</h2>
        <p className="mt-1 font-mono text-[11px] text-neutral-600">
          connect your github account to see boards and health scores from your repos.
        </p>

        {githubConnected ? (
          <div className="mt-3 flex items-center gap-3">
            <span className="inline-block h-2 w-2 rounded-full bg-green-400" />
            <span className="font-mono text-xs text-neutral-300">
              connected as <span className="text-cyan-400">{githubUsername}</span>
            </span>
            {githubConnectedAt && (
              <span className="font-mono text-[10px] text-neutral-700">
                since {new Date(githubConnectedAt).toLocaleDateString()}
              </span>
            )}
          </div>
        ) : (
          <a
            href="/api/github/connect"
            className="mt-3 inline-flex items-center gap-2 rounded-md border border-neutral-800 bg-neutral-900 px-4 py-2 font-mono text-xs text-neutral-200 transition-colors hover:border-neutral-600 hover:bg-neutral-800"
          >
            <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
            connect github
          </a>
        )}
      </div>
    </main>
  );
}

export function SettingsClient(props: SettingsClientProps) {
  return (
    <Suspense>
      <SettingsContent {...props} />
    </Suspense>
  );
}
