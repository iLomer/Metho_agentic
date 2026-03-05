import { execFile } from "node:child_process";
import { resolve } from "node:path";
import * as p from "@clack/prompts";

/**
 * Result of the GitHub post-scaffold flow.
 * Contains information about whether a repo was created and its URL.
 */
export interface GitHubResult {
  /** Whether a GitHub repository was successfully created. */
  repoCreated: boolean;
  /** The URL of the created repository, if any. */
  repoUrl: string | undefined;
}

/**
 * Checks whether the GitHub CLI (`gh`) is installed by running `gh --version`.
 * Resolves to true if `gh` is found, false otherwise.
 */
export function checkGhInstalled(): Promise<boolean> {
  return new Promise((promiseResolve) => {
    execFile("gh", ["--version"], (error) => {
      promiseResolve(error === null);
    });
  });
}

/**
 * Checks whether the GitHub CLI is authenticated by running `gh auth status`.
 * Resolves to true if the user is logged in, false otherwise.
 */
export function checkGhAuthenticated(): Promise<boolean> {
  return new Promise((promiseResolve) => {
    execFile("gh", ["auth", "status"], (error) => {
      promiseResolve(error === null);
    });
  });
}

/**
 * Creates a GitHub repository using the `gh` CLI.
 * Returns the repository URL on success.
 *
 * @param projectName - The name for the new repository
 * @param visibility - Whether the repo should be "public" or "private"
 * @param cwd - The local directory containing the git repo
 */
function createGhRepo(
  projectName: string,
  visibility: "public" | "private",
  cwd: string,
): Promise<string> {
  const absoluteCwd = resolve(cwd);
  const visibilityFlag = visibility === "public" ? "--public" : "--private";

  return new Promise((promiseResolve, promiseReject) => {
    execFile(
      "gh",
      [
        "repo",
        "create",
        projectName,
        visibilityFlag,
        "--source",
        ".",
        "--remote",
        "origin",
        "--push",
      ],
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
 * Runs the post-scaffold GitHub repository creation flow.
 *
 * Checks for `gh` CLI installation and authentication, then optionally
 * creates a new GitHub repository. Returns a result indicating whether
 * a repo was created and its URL.
 *
 * This function is a no-op if `gitAvailable` is false (git was skipped).
 *
 * @param projectName - The project name (used as the repo name)
 * @param outputDir - The scaffolded project directory
 * @param gitAvailable - Whether git is available on the system
 */
export async function runGitHubFlow(
  projectName: string,
  outputDir: string,
  gitAvailable: boolean,
): Promise<GitHubResult> {
  const noResult: GitHubResult = { repoCreated: false, repoUrl: undefined };

  if (!gitAvailable) {
    return noResult;
  }

  const ghInstalled = await checkGhInstalled();
  if (!ghInstalled) {
    p.log.info(
      "GitHub CLI not found. Install it to create repos from the terminal: https://cli.github.com",
    );
    return noResult;
  }

  const ghAuthenticated = await checkGhAuthenticated();
  if (!ghAuthenticated) {
    p.log.info(
      "GitHub CLI found but not logged in. Run `gh auth login` to connect your account.",
    );
    return noResult;
  }

  const shouldCreate = await p.confirm({
    message: "Create a GitHub repository for this project?",
    initialValue: true,
  });

  if (p.isCancel(shouldCreate) || !shouldCreate) {
    return noResult;
  }

  const visibility = await p.select<"public" | "private">({
    message: "Repository visibility?",
    options: [
      { value: "private", label: "Private", hint: "only you can see it" },
      { value: "public", label: "Public", hint: "anyone can see it" },
    ],
  });

  if (p.isCancel(visibility)) {
    return noResult;
  }

  const ghSpinner = p.spinner();
  ghSpinner.start("Creating GitHub repository...");

  try {
    const repoUrl = await createGhRepo(projectName, visibility, outputDir);
    ghSpinner.stop(`Repository created: ${repoUrl}`);
    return { repoCreated: true, repoUrl };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    ghSpinner.stop(`GitHub repo creation failed: ${message}`);
    p.log.warning(
      "The project was scaffolded successfully. You can create a GitHub repo manually later.",
    );
    return noResult;
  }
}
