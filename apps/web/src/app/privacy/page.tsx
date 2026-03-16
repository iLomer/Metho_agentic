import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

export const metadata: Metadata = {
  title: "privacy — buildrack",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200">
      <nav className="border-b border-neutral-800/60">
        <div className="mx-auto flex h-12 max-w-4xl items-center px-4">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/Buildrack.png" alt="Buildrack" width={20} height={20} className="rounded-sm" />
            <span className="font-mono text-sm font-medium text-neutral-300">buildrack</span>
          </Link>
        </div>
      </nav>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="font-mono text-lg font-medium text-neutral-200">privacy policy</h1>
        <p className="mt-1 font-mono text-[10px] text-neutral-700">last updated: march 6, 2026</p>

        <div className="mt-6 space-y-5 font-mono text-xs leading-relaxed text-neutral-400">
          <section>
            <h2 className="mb-1.5 text-xs text-neutral-300">what we collect</h2>
            <p>
              when you sign in with google, we receive your name, email, and profile picture
              from your google account. we store this to identify your account and display
              your name on public projects.
            </p>
            <p className="mt-1.5">
              we store the project data you create — names, descriptions, stack, ai tools,
              urls, connected services, costs, and notes. this is the core of what buildrack does.
            </p>
          </section>

          <section>
            <h2 className="mb-1.5 text-xs text-neutral-300">how we store it</h2>
            <p>
              your data is stored in supabase (managed postgresql). all data is encrypted at
              rest using AES-256 and encrypted in transit via TLS. each account is isolated
              using row-level security — no user can access another user&apos;s data at the
              database level.
            </p>
          </section>

          <section>
            <h2 className="mb-1.5 text-xs text-neutral-300">private by default</h2>
            <p>
              all projects are private by default. only you can see your projects, costs,
              and notes. when you toggle a project to &quot;public&quot;, only the project name,
              description, stack, ai tools, urls, and connected service names become
              visible. costs and notes are never shown publicly.
            </p>
          </section>

          <section>
            <h2 className="mb-1.5 text-xs text-neutral-300">what we don&apos;t do</h2>
            <ul className="list-inside list-disc space-y-1 text-neutral-500">
              <li>we don&apos;t sell your data</li>
              <li>we don&apos;t run ads</li>
              <li>we don&apos;t share your data with third parties beyond infrastructure providers (supabase, vercel)</li>
              <li>we don&apos;t use your project data to train AI models</li>
              <li>we don&apos;t track you across the web — no analytics scripts, no cookies beyond auth</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-1.5 text-xs text-neutral-300">deleting your data</h2>
            <p>
              you can delete any project at any time. to delete your entire account
              and all associated data, contact us and we&apos;ll remove everything
              within 48 hours.
            </p>
          </section>

          <section>
            <h2 className="mb-1.5 text-xs text-neutral-300">infrastructure</h2>
            <ul className="list-inside list-disc space-y-1 text-neutral-500">
              <li>hosting: vercel (united states)</li>
              <li>database: supabase (AWS, united states)</li>
              <li>auth: supabase auth (google oauth)</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-1.5 text-xs text-neutral-300">contact</h2>
            <p>
              questions about privacy? reach out at{" "}
              <a href="mailto:hello@buildrack.com" className="text-cyan-600 hover:text-cyan-400">
                hello@buildrack.com
              </a>
            </p>
          </section>
        </div>

        <div className="mt-8 border-t border-neutral-800/40 pt-4">
          <Link href="/" className="font-mono text-[10px] text-neutral-700 hover:text-neutral-500">
            &larr; back
          </Link>
        </div>
      </main>
    </div>
  );
}
