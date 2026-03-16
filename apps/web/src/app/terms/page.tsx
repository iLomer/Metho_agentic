import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

export const metadata: Metadata = {
  title: "terms — buildrack",
};

export default function TermsPage() {
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
        <h1 className="font-mono text-lg font-medium text-neutral-200">terms of service</h1>
        <p className="mt-1 font-mono text-[10px] text-neutral-700">last updated: march 6, 2026</p>

        <div className="mt-6 space-y-5 font-mono text-xs leading-relaxed text-neutral-400">
          <section>
            <h2 className="mb-1.5 text-xs text-neutral-300">what buildrack is</h2>
            <p>
              buildrack is a project tracking tool for developers and indie hackers who build
              with AI-assisted tools. it lets you store project metadata — stack, services,
              costs, urls — and optionally share projects publicly.
            </p>
          </section>

          <section>
            <h2 className="mb-1.5 text-xs text-neutral-300">your account</h2>
            <p>
              you sign in via google oauth. you&apos;re responsible for the security of your
              google account. one person, one account. don&apos;t share your session or
              impersonate others.
            </p>
          </section>

          <section>
            <h2 className="mb-1.5 text-xs text-neutral-300">your data</h2>
            <p>
              you own your data. we store it to provide the service. you can delete
              individual projects at any time, or request full account deletion.
              we don&apos;t claim any rights over the content you create.
            </p>
          </section>

          <section>
            <h2 className="mb-1.5 text-xs text-neutral-300">public projects</h2>
            <p>
              when you toggle a project to public, its name, description, stack, ai tools,
              urls, and service names become visible to anyone with the link and on the
              community feed. costs and notes remain private. you can make a project
              private again at any time.
            </p>
          </section>

          <section>
            <h2 className="mb-1.5 text-xs text-neutral-300">acceptable use</h2>
            <p>don&apos;t use buildrack to:</p>
            <ul className="mt-1.5 list-inside list-disc space-y-1 text-neutral-500">
              <li>post illegal, harmful, or abusive content in public projects</li>
              <li>spam the community feed with fake or misleading projects</li>
              <li>attempt to access other users&apos; private data</li>
              <li>use automated tools to scrape the feed or abuse the service</li>
            </ul>
            <p className="mt-1.5">
              we reserve the right to remove content or suspend accounts that violate
              these terms.
            </p>
          </section>

          <section>
            <h2 className="mb-1.5 text-xs text-neutral-300">the service</h2>
            <p>
              buildrack is provided &quot;as is&quot;. we aim for high availability but
              don&apos;t guarantee uptime. we may change features, pricing (currently free),
              or shut down the service with reasonable notice. if we shut down, we&apos;ll
              give you time to export your data.
            </p>
          </section>

          <section>
            <h2 className="mb-1.5 text-xs text-neutral-300">liability</h2>
            <p>
              buildrack is a project tracking tool, not a backup service. we&apos;re not
              liable for data loss beyond what&apos;s covered by our infrastructure
              providers&apos; SLAs. don&apos;t store sensitive credentials, passwords,
              or secrets in your project cards.
            </p>
          </section>

          <section>
            <h2 className="mb-1.5 text-xs text-neutral-300">contact</h2>
            <p>
              questions?{" "}
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
