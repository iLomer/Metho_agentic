"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createProject, type FormState } from "./actions";
import { ProjectFormFields } from "@/components/project-form-fields";

const initialState: FormState = { errors: {}, success: false };

export default function NewProjectPage() {
  const [state, formAction, isPending] = useActionState(
    createProject,
    initialState,
  );

  return (
    <main className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="font-mono text-sm text-neutral-300">new project</h1>
        <Link
          href="/dashboard"
          className="font-mono text-xs text-neutral-600 hover:text-neutral-400"
        >
          cancel
        </Link>
      </div>

      {state.errors.form && (
        <div className="mb-4 border border-red-900 bg-red-950/50 px-3 py-2 font-mono text-xs text-red-400">
          {state.errors.form}
        </div>
      )}

      <form action={formAction} className="space-y-5">
        <ProjectFormFields errors={state.errors} />

        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href="/dashboard"
            className="font-mono text-xs text-neutral-600 hover:text-neutral-400"
          >
            cancel
          </Link>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-cyan-400 px-3 py-1.5 font-mono text-xs font-medium text-neutral-950 transition-colors hover:bg-cyan-300 disabled:opacity-50"
          >
            {isPending ? "creating..." : "create"}
          </button>
        </div>
      </form>
    </main>
  );
}
