import { execFile } from "node:child_process";
import { resolve } from "node:path";

/**
 * Executes a git command in the specified directory.
 * Returns a promise that resolves with stdout or rejects with an error.
 */
function runGit(args: string[], cwd: string): Promise<string> {
  return new Promise((promiseResolve, promiseReject) => {
    execFile("git", args, { cwd }, (error, stdout, stderr) => {
      if (error) {
        const message = stderr.trim() || error.message;
        promiseReject(new Error(`git ${args[0]}: ${message}`));
        return;
      }
      promiseResolve(stdout.trim());
    });
  });
}

/**
 * Initializes a git repository in the output directory and creates
 * an initial commit with all scaffolded files.
 *
 * Assumes the .gitignore has already been written as part of the
 * template rendering step.
 *
 * @param outputDir - The scaffolded project directory
 */
export async function initGitRepo(outputDir: string): Promise<void> {
  const absoluteDir = resolve(outputDir);

  await runGit(["init"], absoluteDir);
  await runGit(["add", "-A"], absoluteDir);
  await runGit(
    ["commit", "-m", "chore(scaffold): initialize project [bootstrap]"],
    absoluteDir,
  );
}
