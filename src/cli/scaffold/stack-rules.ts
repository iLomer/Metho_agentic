/**
 * Path-scoped stack rules: `.claude/rules/stack.md`.
 *
 * Claude Code loads a rule with `paths:` frontmatter only when an agent reads
 * or edits a matching file, so the stack's rules reach the agent at the moment
 * it touches that kind of code instead of sitting in a document it has to be
 * told to open.
 */

import { getStackRuleLines } from "../stacks.js";
import type { TechStack } from "../types.js";

/** Where the rule file lives, relative to the project root. */
export const STACK_RULES_PATH = ".claude/rules/stack.md";

interface StackRuleScope {
  title: string;
  paths: string[];
}

const SCOPES: Record<Exclude<TechStack, "custom">, StackRuleScope> = {
  "nextjs-supabase": { title: "Next.js + Supabase", paths: ["**/*.{ts,tsx}", "supabase/**"] },
  "react-native": { title: "React Native", paths: ["**/*.{ts,tsx}"] },
  "nodejs-cli": { title: "Node.js CLI", paths: ["**/*.ts"] },
  "python-fastapi": { title: "Python / FastAPI", paths: ["**/*.py"] },
  go: { title: "Go", paths: ["**/*.go"] },
  "vite-react": { title: "Vite + React", paths: ["**/*.{ts,tsx}", "**/*.css"] },
  flutter: { title: "Flutter", paths: ["**/*.dart"] },
};

/**
 * Renders the stack rule file for a preset stack.
 *
 * @returns the file content, or undefined for a custom stack (no preset rules)
 */
export function generateStackRules(stack: TechStack): string | undefined {
  if (stack === "custom") {
    return undefined;
  }
  const scope = SCOPES[stack];
  return [
    "---",
    "paths:",
    ...scope.paths.map((path) => `  - "${path}"`),
    "---",
    "",
    `# ${scope.title} rules`,
    "",
    getStackRuleLines(stack),
    "",
  ].join("\n");
}
