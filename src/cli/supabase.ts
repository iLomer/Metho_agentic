import { execFile } from "node:child_process";
import { resolve } from "node:path";
import * as p from "@clack/prompts";
import type { TechStack } from "./types.js";

/**
 * Result of the Supabase post-scaffold flow.
 */
export interface SupabaseResult {
  /** Whether Supabase was initialized in the project. */
  initialized: boolean;
}

/**
 * Checks whether the Supabase CLI is installed by running `supabase --version`.
 * Resolves to true if `supabase` is found, false otherwise.
 */
export function checkSupabaseInstalled(): Promise<boolean> {
  return new Promise((promiseResolve) => {
    execFile("supabase", ["--version"], (error) => {
      promiseResolve(error === null);
    });
  });
}

/**
 * Runs `supabase init` in the specified directory.
 * Returns a promise that resolves on success or rejects with an error.
 */
function runSupabaseInit(cwd: string): Promise<string> {
  const absoluteCwd = resolve(cwd);

  return new Promise((promiseResolve, promiseReject) => {
    execFile(
      "supabase",
      ["init"],
      { cwd: absoluteCwd },
      (error, stdout, stderr) => {
        if (error) {
          const message = stderr.trim() || error.message;
          promiseReject(new Error(message));
          return;
        }
        promiseResolve(stdout.trim());
      },
    );
  });
}

/**
 * Runs the post-scaffold Supabase setup flow.
 *
 * Only runs when the selected stack is "nextjs-supabase". Checks for the
 * Supabase CLI, and if found, offers to run `supabase init` in the project.
 *
 * @param techStack - The user's selected tech stack
 * @param outputDir - The scaffolded project directory
 */
export async function runSupabaseFlow(
  techStack: TechStack,
  outputDir: string,
): Promise<SupabaseResult> {
  const noResult: SupabaseResult = { initialized: false };

  if (techStack !== "nextjs-supabase") {
    return noResult;
  }

  const installed = await checkSupabaseInstalled();
  if (!installed) {
    p.log.info(
      "Supabase CLI not found. Install it to manage your database locally: https://supabase.com/docs/guides/cli/getting-started",
    );
    return noResult;
  }

  const shouldInit = await p.confirm({
    message: "Initialize Supabase in this project?",
    initialValue: true,
  });

  if (p.isCancel(shouldInit) || !shouldInit) {
    return noResult;
  }

  const supabaseSpinner = p.spinner();
  supabaseSpinner.start("Initializing Supabase...");

  try {
    await runSupabaseInit(outputDir);
    supabaseSpinner.stop(
      "Supabase initialized. Run `supabase start` to launch the local development stack.",
    );
    return { initialized: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    supabaseSpinner.stop(`Supabase initialization failed: ${message}`);
    p.log.warning(
      "The project was scaffolded successfully. You can run `supabase init` manually later.",
    );
    return noResult;
  }
}
