import * as p from "@clack/prompts";
import type { ProjectBrief, TechStack } from "./types.js";

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
 * Collects the project brief from the user via interactive prompts.
 * Returns the completed brief. Exits the process if the user cancels.
 */
export async function collectProjectBrief(): Promise<ProjectBrief> {
  const projectName = await p.text({
    message: "What is your project name?",
    placeholder: "my-awesome-project",
    validate: validateProjectName,
  });
  handleCancel(projectName);

  const description = await p.text({
    message: "Describe your project in one line.",
    placeholder: "A task management app for remote teams",
    validate: requireNonEmpty,
  });
  handleCancel(description);

  const targetUsers = await p.text({
    message: "Who are the target users?",
    placeholder: "Developers, small teams, freelancers",
    validate: requireNonEmpty,
  });
  handleCancel(targetUsers);

  const techStack = await p.select<TechStack>({
    message: "Choose a tech stack.",
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
      message: "Describe your tech stack.",
      placeholder: "Django + PostgreSQL + React frontend",
      validate: requireNonEmpty,
    });
    handleCancel(customStackInput);
    customStack = customStackInput.trim();
  }

  const defaultDeferred = "To be defined by @meto-pm";

  const problemStatement = await p.text({
    message: "What problem does this project solve?",
    placeholder: "Users struggle with X because Y, leading to Z",
    defaultValue: defaultDeferred,
  });
  handleCancel(problemStatement);

  const successCriteria = await p.text({
    message: "How will you measure success?",
    placeholder: "User can do X in under Y minutes, Z% adoption in first month",
    defaultValue: defaultDeferred,
  });
  handleCancel(successCriteria);

  const valueProposition = await p.text({
    message: "What is the core value proposition? (one line)",
    placeholder: "The fastest way to do X without compromising on Y",
    defaultValue: defaultDeferred,
  });
  handleCancel(valueProposition);

  const outOfScope = await p.text({
    message: "What is out of scope for v1?",
    placeholder: "Multi-tenancy, mobile app, internationalization",
    defaultValue: defaultDeferred,
  });
  handleCancel(outOfScope);

  const defaultConventions =
    "TypeScript strict mode, no any types, no console.log in production code";

  const codeConventions = await p.text({
    message: "Any code conventions or standards?",
    placeholder: "TypeScript strict, ESLint, Prettier, conventional commits",
    defaultValue: defaultConventions,
  });
  handleCancel(codeConventions);

  const outputDirectory = await p.text({
    message: "Output directory?",
    defaultValue: `./${projectName}`,
    placeholder: `./${projectName}`,
    validate: requireNonEmpty,
  });
  handleCancel(outputDirectory);

  return {
    projectName: projectName.trim(),
    description: description.trim(),
    targetUsers: targetUsers.trim(),
    techStack,
    customStack,
    problemStatement: problemStatement.trim(),
    successCriteria: successCriteria.trim(),
    valueProposition: valueProposition.trim(),
    outOfScope: outOfScope.trim(),
    codeConventions: codeConventions.trim(),
    outputDirectory: outputDirectory.trim(),
  };
}
