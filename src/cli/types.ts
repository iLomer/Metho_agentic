/**
 * Tech stack presets available during project scaffolding.
 */
export type TechStack =
  | "nextjs-supabase"
  | "react-native"
  | "nodejs-cli"
  | "custom";

/**
 * The brief collected from the user during `lom init`.
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
  /** Absolute or relative path where the scaffold will be written */
  outputDirectory: string;
}
