import type { TechStack } from "./types.js";

/**
 * Structured description for the Next.js + Supabase stack.
 */
const NEXTJS_SUPABASE_DESCRIPTION = `## Stack Overview

| Layer | Choice | Reason |
|---|---|---|
| UI | Next.js (React) | Server-side rendering, file-based routing, API routes built-in |
| API | Next.js API Routes | Co-located with frontend, serverless-ready |
| Database | Supabase (PostgreSQL) | Managed Postgres with real-time subscriptions and auto-generated APIs |
| Auth | Supabase Auth | Built-in email/password, OAuth providers, row-level security |
| Hosting | Vercel | Zero-config Next.js deploys, edge functions, preview deployments |

## Key Libraries
- **Tailwind CSS** -- utility-first styling
- **TypeScript** -- strict mode throughout`;

/**
 * Structured description for the React Native stack.
 */
const REACT_NATIVE_DESCRIPTION = `## Stack Overview

| Layer | Choice | Reason |
|---|---|---|
| UI | React Native | Cross-platform iOS and Android from a single codebase |
| Navigation | React Navigation | Industry-standard navigation library with native feel |
| State | Zustand or Redux Toolkit | Lightweight state management with TypeScript support |
| Backend | Supabase or custom API | Flexible backend choice depending on project needs |

## Key Libraries
- **Expo** -- managed workflow for faster development
- **TypeScript** -- strict mode throughout`;

/**
 * Structured description for the Node.js CLI stack.
 */
const NODEJS_CLI_DESCRIPTION = `## Stack Overview

| Layer | Choice | Reason |
|---|---|---|
| Runtime | Node.js | Ubiquitous JavaScript runtime with rich ecosystem |
| Language | TypeScript | Type safety and better developer experience |
| Distribution | npm | Standard package distribution, supports npx for zero-install usage |
| Prompts | @clack/prompts | Beautiful terminal UI with spinners, selects, and validation |

## Key Libraries
- **commander or yargs** -- argument parsing (if needed)
- **vitest** -- fast TypeScript-native testing`;

const STACK_DESCRIPTIONS: Record<Exclude<TechStack, "custom">, string> = {
  "nextjs-supabase": NEXTJS_SUPABASE_DESCRIPTION,
  "react-native": REACT_NATIVE_DESCRIPTION,
  "nodejs-cli": NODEJS_CLI_DESCRIPTION,
};

/**
 * Definition of Done criteria for the Next.js + Supabase stack.
 */
const NEXTJS_SUPABASE_DOD = `## Universal Checks
- [ ] TypeScript compiles with no errors (\`npx tsc --noEmit\`)
- [ ] No \`any\` types in changed files
- [ ] No \`console.log\` in committed code
- [ ] No commented-out code in committed files
- [ ] Error states handled (loading, empty, error UI)

## Stack-Specific Checks
- [ ] Supabase migrations applied and tested locally
- [ ] Environment variables documented in \`.env.example\`
- [ ] Responsive on mobile (tested at 375px width minimum)
- [ ] API routes return proper HTTP status codes
- [ ] Row-level security policies reviewed for new tables`;

/**
 * Definition of Done criteria for the React Native stack.
 */
const REACT_NATIVE_DOD = `## Universal Checks
- [ ] TypeScript compiles with no errors (\`npx tsc --noEmit\`)
- [ ] No \`any\` types in changed files
- [ ] No \`console.log\` in committed code
- [ ] No commented-out code in committed files
- [ ] Error states handled (loading, empty, error UI)

## Stack-Specific Checks
- [ ] Runs on iOS simulator without crash
- [ ] Runs on Android emulator without crash
- [ ] Navigation works (forward, back, deep links if applicable)
- [ ] No hardcoded dimensions (use responsive units)
- [ ] Keyboard does not obscure input fields`;

/**
 * Definition of Done criteria for the Node.js CLI stack.
 */
const NODEJS_CLI_DOD = `## Universal Checks
- [ ] TypeScript compiles with no errors (\`npx tsc --noEmit\`)
- [ ] No \`any\` types in changed files
- [ ] No \`console.log\` in committed code
- [ ] No commented-out code in committed files
- [ ] Error states handled (graceful error messages, no stack traces for users)

## Stack-Specific Checks
- [ ] Help text present and accurate (\`--help\`)
- [ ] Exit codes correct (0 for success, 1 for errors)
- [ ] Unit tests pass (\`npm test\`)
- [ ] CLI runs without crash on a clean install (\`npx\`)
- [ ] No hardcoded file paths (use platform-agnostic path resolution)`;

/**
 * Definition of Done criteria for a custom stack.
 */
const CUSTOM_STACK_DOD = `## Universal Checks
- [ ] TypeScript compiles with no errors (\`npx tsc --noEmit\`)
- [ ] No \`any\` types in changed files
- [ ] No \`console.log\` in committed code
- [ ] No commented-out code in committed files
- [ ] Error states handled

## Stack-Specific Checks
*Add stack-specific checks here based on your chosen technology.*`;

const STACK_DODS: Record<Exclude<TechStack, "custom">, string> = {
  "nextjs-supabase": NEXTJS_SUPABASE_DOD,
  "react-native": REACT_NATIVE_DOD,
  "nodejs-cli": NODEJS_CLI_DOD,
};

/**
 * Starter epics for the Next.js + Supabase stack.
 */
const NEXTJS_SUPABASE_EPICS = `## E1 -- Project Setup
**Goal:** Initialize the Next.js app with Tailwind CSS, configure Supabase client, and establish the development environment.
**Status:** Not started
**Tasks:** To be sliced by @lom-pm

---

## E2 -- Auth
**Goal:** Implement sign up, sign in, and sign out using Supabase Auth with row-level security.
**Status:** Not started
**Tasks:** To be sliced by @lom-pm

---

## E3 -- Core Feature
**Goal:** Build the primary feature of the application. To be defined by @lom-pm based on the product vision.
**Status:** Not started
**Tasks:** To be sliced by @lom-pm

---

## E4 -- Deploy
**Goal:** Deploy to Vercel, configure custom domain, and set up environment variables for production.
**Status:** Not started
**Tasks:** To be sliced by @lom-pm`;

/**
 * Starter epics for the React Native stack.
 */
const REACT_NATIVE_EPICS = `## E1 -- Project Setup
**Goal:** Initialize the Expo project with React Navigation and configure the development environment.
**Status:** Not started
**Tasks:** To be sliced by @lom-pm

---

## E2 -- Auth
**Goal:** Implement authentication (sign up, sign in, sign out) with secure token storage.
**Status:** Not started
**Tasks:** To be sliced by @lom-pm

---

## E3 -- Core Feature
**Goal:** Build the primary feature of the application. To be defined by @lom-pm based on the product vision.
**Status:** Not started
**Tasks:** To be sliced by @lom-pm

---

## E4 -- App Store Prep
**Goal:** Prepare the app for App Store and Play Store submission including icons, splash screen, and metadata.
**Status:** Not started
**Tasks:** To be sliced by @lom-pm`;

/**
 * Starter epics for the Node.js CLI stack.
 */
const NODEJS_CLI_EPICS = `## E1 -- CLI Scaffold
**Goal:** Set up the CLI entry point with help text, version flag, and argument parsing.
**Status:** Not started
**Tasks:** To be sliced by @lom-pm

---

## E2 -- Core Command
**Goal:** Implement the primary command that delivers the core value of the CLI tool.
**Status:** Not started
**Tasks:** To be sliced by @lom-pm

---

## E3 -- Testing + CI
**Goal:** Add unit tests, integration tests, and configure continuous integration.
**Status:** Not started
**Tasks:** To be sliced by @lom-pm

---

## E4 -- npm Publish
**Goal:** Prepare for npm publication including package.json metadata, README, and publish workflow.
**Status:** Not started
**Tasks:** To be sliced by @lom-pm`;

/**
 * Starter epics for a custom stack.
 */
const CUSTOM_STACK_EPICS = `## E1 -- Project Setup
**Goal:** Initialize the project structure, install dependencies, and configure the development environment.
**Status:** Not started
**Tasks:** To be sliced by @lom-pm

---

## E2 -- Core Feature
**Goal:** Build the primary feature of the application. To be defined by @lom-pm based on the product vision.
**Status:** Not started
**Tasks:** To be sliced by @lom-pm

---

## E3 -- Testing
**Goal:** Add unit tests and integration tests to ensure quality and enable confident refactoring.
**Status:** Not started
**Tasks:** To be sliced by @lom-pm

---

## E4 -- Deploy
**Goal:** Set up deployment pipeline and ship the first version to production.
**Status:** Not started
**Tasks:** To be sliced by @lom-pm`;

const STACK_EPICS: Record<Exclude<TechStack, "custom">, string> = {
  "nextjs-supabase": NEXTJS_SUPABASE_EPICS,
  "react-native": REACT_NATIVE_EPICS,
  "nodejs-cli": NODEJS_CLI_EPICS,
};

/**
 * Returns a structured markdown description for the selected tech stack.
 *
 * For preset stacks, returns a detailed table-formatted description with
 * layers, choices, and reasons. For custom stacks, returns the user's
 * free-text input under a "Custom Stack" heading.
 *
 * @param stack - The selected tech stack preset
 * @param customStack - The user's free-text stack description (when stack is "custom")
 * @returns Formatted markdown string describing the stack
 */
export function getStackDescription(
  stack: TechStack,
  customStack?: string,
): string {
  if (stack === "custom") {
    const description = customStack ?? "Custom stack -- details to be defined";
    return `## Custom Stack\n\n${description}`;
  }

  return STACK_DESCRIPTIONS[stack];
}

/**
 * Returns the Definition of Done criteria for the selected tech stack.
 *
 * For preset stacks, returns stack-specific criteria including universal
 * checks and technology-specific quality gates. For custom stacks,
 * returns universal checks with a placeholder for stack-specific items.
 *
 * @param stack - The selected tech stack preset
 * @param customStack - The user's free-text stack description (when stack is "custom")
 * @returns Formatted markdown string with Definition of Done checklist
 */
export function getDefinitionOfDone(
  stack: TechStack,
  customStack?: string,
): string {
  if (stack === "custom") {
    return customStack !== undefined
      ? `${CUSTOM_STACK_DOD}\n\n> Custom stack: ${customStack}`
      : CUSTOM_STACK_DOD;
  }

  return STACK_DODS[stack];
}

/**
 * Returns starter epics for the selected tech stack.
 *
 * For preset stacks, returns stack-specific epics with realistic goals.
 * For custom stacks, returns generic but useful epics. Each epic includes
 * a goal, status (not started), and a note that tasks should be sliced
 * by the PM agent.
 *
 * @param stack - The selected tech stack preset
 * @param projectName - The project name (used in the heading)
 * @param customStack - The user's free-text stack description (when stack is "custom")
 * @returns Formatted markdown string with starter epics
 */
export function getStarterEpics(
  stack: TechStack,
  projectName: string,
  customStack?: string,
): string {
  const heading = `# Epics -- ${projectName}\n\nHigh-level orientation. Full task definitions live in \`tasks-backlog.md\`.\nGenerated by Lom based on stack selection. Refine with @lom-pm.\n\n---\n\n`;

  if (stack === "custom") {
    const note =
      customStack !== undefined
        ? `\n\n---\n\n> Custom stack: ${customStack}. Adjust epics to match your technology choices.`
        : "";
    return heading + CUSTOM_STACK_EPICS + note;
  }

  return heading + STACK_EPICS[stack];
}
