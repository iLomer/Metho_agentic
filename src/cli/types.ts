/**
 * Tech stack presets available during project scaffolding.
 */
export type TechStack =
  | "nextjs-supabase"
  | "react-native"
  | "nodejs-cli"
  | "python-fastapi"
  | "go"
  | "vite-react"
  | "flutter"
  | "custom";

/**
 * Workflow mode: sprint (sequential) or swarm (parallel epic agents).
 */
export type WorkflowMode = "sprint" | "swarm";

/**
 * The brief collected from the user during `meto-cli init`.
 * Contains everything needed to render templates and scaffold a project.
 */
export interface ProjectBrief {
  /** Kebab-case project name, used as directory name and package name */
  projectName: string;
  /** One-line description of what the project does */
  description: string;
  /** Who the project is for */
  targetUsers: string;
  /** Selected tech stack preset or "custom" */
  techStack: TechStack;
  /** Free-text stack description when techStack is "custom" */
  customStack: string | undefined;
  /** What problem this project solves */
  problemStatement: string;
  /** How success is measured */
  successCriteria: string;
  /** Core value proposition in one line */
  valueProposition: string;
  /** What is explicitly out of scope for v1 */
  outOfScope: string;
  /** Project-specific code conventions and standards */
  codeConventions: string;
  /** Absolute or relative path where the scaffold will be written */
  outputDirectory: string;
  /** Workflow mode: sprint (sequential) or swarm (parallel epic agents) */
  workflowMode: WorkflowMode;
}
