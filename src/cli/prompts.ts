import { readFile } from "node:fs/promises";
import * as p from "@clack/prompts";
import type { ProjectBrief, TechStack } from "./types.js";

/**
 * If the input matches an existing file path, reads and returns its content.
 * Otherwise returns the original string as-is.
 */
async function resolveFileOrString(input: string): Promise<string> {
  const trimmed = input.trim();
  try {
    const content = await readFile(trimmed, "utf-8");
    p.log.info(`Read content from ${trimmed}`);
    return content.trim();
  } catch {
    return trimmed;
  }
}

/**
 * Validates that a string is non-empty after trimming.
 */
function requireNonEmpty(value: string): string | undefined {
  if (value.trim().length === 0) {
    return "This field is required.";
  }
  return undefined;
}

/**
 * Validates a project name: non-empty, kebab-case friendly.
 */
function validateProjectName(value: string): string | undefined {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return "Project name is required.";
  }
  if (!/^[a-z0-9][a-z0-9-]*$/.test(trimmed)) {
    return "Use lowercase letters, numbers, and hyphens only (e.g. my-project).";
  }
  return undefined;
}

/**
 * Handles cancellation by printing a message and exiting.
 */
function handleCancel(value: unknown): asserts value is string {
  if (p.isCancel(value)) {
    p.cancel("Project setup cancelled.");
    process.exit(0);
  }
}

/**
 * Options for controlling the prompt flow.
 */
export interface CollectBriefOptions {
  /** When true, skips deep content prompts (AI will generate those). */
  useAI?: boolean;
}

/**
 * Deep content fields collected from the user when AI is not used.
 */
export interface DeepContentFields {
  problemStatement: string;
  successCriteria: string;
  valueProposition: string;
  outOfScope: string;
  codeConventions: string;
}

const DEFAULT_DEFERRED = "To be filled in later";
const DEFAULT_CONVENTIONS =
  "TypeScript strict mode, no any types, no console.log in production code";

/**
 * Collects the deep content prompts (problem statement, success criteria,
 * value proposition, out of scope, code conventions).
 * Called during the normal static flow, or as a fallback when AI generation fails.
 */
export async function collectDeepContent(): Promise<DeepContentFields> {
  const problemInput = await p.text({
    message: "What pain point does this solve for your users?",
    placeholder: "Managing tasks across multiple tools is chaotic",
    defaultValue: DEFAULT_DEFERRED,
  });
  handleCancel(problemInput);

  const criteriaInput = await p.text({
    message: "What does success look like for your users?",
    placeholder: "They can manage a full sprint in under 10 minutes a day",
    defaultValue: DEFAULT_DEFERRED,
  });
  handleCancel(criteriaInput);

  const valueInput = await p.text({
    message: "Why would someone use this over alternatives?",
    placeholder: "Simpler than Jira, more structured than a spreadsheet",
    defaultValue: DEFAULT_DEFERRED,
  });
  handleCancel(valueInput);

  const scopeInput = await p.text({
    message: "What are you NOT building in the first version?",
    placeholder: "Mobile app, billing, admin dashboard",
    defaultValue: DEFAULT_DEFERRED,
  });
  handleCancel(scopeInput);

  const conventionsInput = await p.text({
    message: "Any coding rules you want enforced?",
    placeholder: "TypeScript strict, ESLint, Prettier",
    defaultValue: DEFAULT_CONVENTIONS,
  });
  handleCancel(conventionsInput);

  return {
    problemStatement: problemInput.trim(),
    successCriteria: criteriaInput.trim(),
    valueProposition: valueInput.trim(),
    outOfScope: scopeInput.trim(),
    codeConventions: conventionsInput.trim(),
  };
}

/**
 * Collects the project brief from the user via interactive prompts.
 * When `options.useAI` is true, skips the deep content prompts (problem statement,
 * success criteria, value proposition, out of scope, code conventions) because
 * the AI generator will produce those.
 * Returns the completed brief. Exits the process if the user cancels.
 */
export async function collectProjectBrief(
  options: CollectBriefOptions = {},
): Promise<ProjectBrief> {
  const projectName = await p.text({
    message: "Name your project",
    placeholder: "my-saas-app",
    validate: validateProjectName,
  });
  handleCancel(projectName);

  const descriptionRaw = await p.text({
    message: "What are you building? (one line, or path to a file)",
    placeholder: "A project management tool for remote teams",
    validate: requireNonEmpty,
  });
  handleCancel(descriptionRaw);
  const description = await resolveFileOrString(descriptionRaw);

  const targetUsersRaw = await p.text({
    message: "Who is this for? (or path to a file)",
    placeholder: "Developers, small teams, freelancers",
    validate: requireNonEmpty,
  });
  handleCancel(targetUsersRaw);
  const targetUsers = await resolveFileOrString(targetUsersRaw);

  const techStack = await p.select<TechStack>({
    message: "Pick your tech stack",
    options: [
      {
        value: "nextjs-supabase",
        label: "Next.js + Supabase",
        hint: "Full-stack web app with auth, database, and edge functions",
      },
      {
        value: "react-native",
        label: "React Native",
        hint: "Cross-platform mobile app",
      },
      {
        value: "nodejs-cli",
        label: "Node.js CLI",
        hint: "Command-line tool distributed via npm",
      },
      {
        value: "python-fastapi",
        label: "Python (FastAPI)",
        hint: "REST API with async support, auto-generated docs",
      },
      {
        value: "go",
        label: "Go",
        hint: "Compiled backend service or CLI tool",
      },
      {
        value: "vite-react",
        label: "Vite + React",
        hint: "Client-side SPA with fast dev server",
      },
      {
        value: "flutter",
        label: "Flutter",
        hint: "Cross-platform mobile and web app with Dart",
      },
      {
        value: "custom",
        label: "Custom",
        hint: "Describe your own stack",
      },
    ],
  });
  if (p.isCancel(techStack)) {
    p.cancel("Project setup cancelled.");
    process.exit(0);
  }

  let customStack: string | undefined;
  if (techStack === "custom") {
    const customStackInput = await p.text({
      message: "What tools and frameworks are you using?",
      placeholder: "Django + PostgreSQL + React frontend",
      validate: requireNonEmpty,
    });
    handleCancel(customStackInput);
    customStack = customStackInput.trim();
  }

  let problemStatement = DEFAULT_DEFERRED;
  let successCriteria = DEFAULT_DEFERRED;
  let valueProposition = DEFAULT_DEFERRED;
  let outOfScope = DEFAULT_DEFERRED;
  let codeConventions = DEFAULT_CONVENTIONS;

  if (!options.useAI) {
    const deep = await collectDeepContent();
    problemStatement = deep.problemStatement;
    successCriteria = deep.successCriteria;
    valueProposition = deep.valueProposition;
    outOfScope = deep.outOfScope;
    codeConventions = deep.codeConventions;
  }

  const outputDirectory = await p.text({
    message: "Project folder (. for current directory)",
    defaultValue: `./${projectName}`,
    placeholder: ". for current folder, or ./my-app",
  });
  handleCancel(outputDirectory);

  return {
    projectName: projectName.trim(),
    description: description.trim(),
    targetUsers: targetUsers.trim(),
    techStack,
    customStack,
    problemStatement,
    successCriteria,
    valueProposition,
    outOfScope,
    codeConventions,
    outputDirectory: outputDirectory.trim(),
  };
}
