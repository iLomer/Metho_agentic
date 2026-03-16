import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo + Name */}
        <div className="flex items-center gap-3">
          <Image src="/Buildrack.png" alt="Meto" width={36} height={36} className="rounded-md" />
          <h1 className="font-mono text-xl font-semibold tracking-tight">
            meto
          </h1>
        </div>

        {/* Tagline */}
        <p className="mt-4 font-mono text-sm leading-relaxed text-neutral-400">
          your project command center. track boards, health, costs — across all your projects.
        </p>

        {/* Value props */}
        <div className="mt-6 space-y-3 border-l border-neutral-800 pl-4">
          <div>
            <p className="font-mono text-xs text-neutral-300">projects</p>
            <p className="font-mono text-[11px] text-neutral-600">
              all your projects in one place — stack, services, urls, costs
            </p>
          </div>
          <div>
            <p className="font-mono text-xs text-neutral-300">boards</p>
            <p className="font-mono text-[11px] text-neutral-600">
              see kanban boards across all projects. create tasks from the dashboard.
            </p>
          </div>
          <div>
            <p className="font-mono text-xs text-neutral-300">health</p>
            <p className="font-mono text-[11px] text-neutral-600">
              methodology audit scores per project. know which ones need attention.
            </p>
          </div>
          <div>
            <p className="font-mono text-xs text-neutral-300">agents</p>
            <p className="font-mono text-[11px] text-neutral-600">
              dispatch claude code agents to any project from one screen.
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-8 flex items-center gap-3">
          <Link
            href="/login"
            className="rounded-md bg-cyan-400 px-5 py-2 font-mono text-xs font-medium text-neutral-950 transition-colors hover:bg-cyan-300"
          >
            sign in
          </Link>
        </div>

        {/* Footer */}
        <div className="mt-8 flex items-center gap-3 font-mono text-[10px] text-neutral-700">
          <span>free</span>
          <span className="text-neutral-800">·</span>
          <Link href="/privacy" className="hover:text-neutral-500">privacy</Link>
          <span className="text-neutral-800">·</span>
          <Link href="/terms" className="hover:text-neutral-500">terms</Link>
        </div>
      </div>
    </main>
  );
}
