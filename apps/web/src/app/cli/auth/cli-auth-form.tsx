"use client";

import { useActionState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { approveDeviceCode } from "./actions";
import type { ApproveDeviceState } from "./actions";

const initialState: ApproveDeviceState = {
  error: null,
  success: false,
};

/**
 * Client component: form for entering and submitting a CLI device code.
 * Uses useActionState to handle the server action response.
 */
export function CliAuthForm() {
  const searchParams = useSearchParams();
  const prefillCode = searchParams.get("user_code");
  const formRef = useRef<HTMLFormElement>(null);
  const autoSubmitted = useRef(false);

  const [state, formAction, isPending] = useActionState(
    approveDeviceCode,
    initialState,
  );

  useEffect(() => {
    if (prefillCode && formRef.current && !autoSubmitted.current) {
      autoSubmitted.current = true;
      formRef.current.requestSubmit();
    }
  }, [prefillCode]);

  if (state.success) {
    return (
      <div className="rounded-lg border border-cyan-500/30 bg-cyan-950/20 p-6 text-center">
        <div className="mb-2 font-mono text-lg text-cyan-400">
          cli authorized
        </div>
        <p className="font-mono text-sm text-neutral-400">
          you can close this tab and return to your terminal
        </p>
      </div>
    );
  }

  return (
    <form ref={formRef} action={formAction} className="space-y-6">
      <div className="space-y-2">
        <label
          htmlFor="user_code"
          className="block font-mono text-xs uppercase tracking-wider text-neutral-500"
        >
          device code
        </label>
        <input
          id="user_code"
          name="user_code"
          type="text"
          required
          autoFocus
          autoComplete="off"
          placeholder="XXXX-XXXX"
          defaultValue={prefillCode ?? ""}
          maxLength={9}
          className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-4 py-3 text-center font-mono text-2xl uppercase tracking-[0.3em] text-neutral-100 placeholder:text-neutral-600 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
        />
      </div>

      {state.error && (
        <p className="font-mono text-sm text-red-400">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-cyan-600 px-4 py-3 font-mono text-sm font-medium text-neutral-100 transition-colors hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "approving..." : "approve"}
      </button>

      <p className="text-center font-mono text-xs text-neutral-500">
        this will connect the cli to your buildrack account
      </p>
    </form>
  );
}
