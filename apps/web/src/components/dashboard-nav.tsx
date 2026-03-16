import Image from "next/image";
import Link from "next/link";
import { signOut } from "@/app/dashboard/actions";

export function DashboardNav({ displayName }: { displayName: string }) {
  return (
    <nav className="border-b border-neutral-800/60">
      <div className="mx-auto flex h-12 max-w-4xl items-center justify-between px-4">
        <div className="flex items-center gap-5">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Image src="/Buildrack.png" alt="Meto" width={20} height={20} className="rounded-sm" />
            <span className="font-mono text-sm font-medium text-neutral-300">meto</span>
          </Link>
          <div className="flex items-center gap-1 font-mono text-xs">
            <Link
              href="/dashboard"
              className="rounded-md px-2.5 py-1.5 text-neutral-500 transition-colors hover:bg-neutral-900 hover:text-neutral-300"
            >
              projects
            </Link>
            <Link
              href="/dashboard/agents"
              className="rounded-md px-2.5 py-1.5 text-neutral-500 transition-colors hover:bg-neutral-900 hover:text-neutral-300"
            >
              agents
            </Link>
            <Link
              href="/dashboard/settings"
              className="rounded-md px-2.5 py-1.5 text-neutral-500 transition-colors hover:bg-neutral-900 hover:text-neutral-300"
            >
              settings
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-neutral-600">{displayName}</span>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-md border border-neutral-800 px-2.5 py-1 font-mono text-xs text-neutral-500 transition-colors hover:border-neutral-600 hover:text-neutral-300"
            >
              sign out
            </button>
          </form>
        </div>
      </div>
    </nav>
  );
}
