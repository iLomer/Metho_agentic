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

/**
 * Structured description for the Python (FastAPI) stack.
 */
const PYTHON_FASTAPI_DESCRIPTION = `## Stack Overview

| Layer | Choice | Reason |
|---|---|---|
| Runtime | Python 3.11+ | Modern async support, type hints, broad ecosystem |
| Framework | FastAPI | High-performance async framework with auto-generated docs |
| Database | PostgreSQL or SQLite | Robust relational database with strong Python driver support |
| ORM | SQLAlchemy or Tortoise | Mature ORM with migration support and async capabilities |
| Docs | Auto-generated OpenAPI/Swagger | Interactive API docs available at /docs out of the box |

## Key Libraries
- **Pydantic** -- data validation and serialization
- **Alembic** -- database migration management`;

/**
 * Structured description for the Go stack.
 */
const GO_DESCRIPTION = `## Stack Overview

| Layer | Choice | Reason |
|---|---|---|
| Language | Go 1.22+ | Fast compilation, built-in concurrency, single binary output |
| HTTP | net/http or Chi/Gin | Standard library or lightweight router depending on complexity |
| Database | PostgreSQL via pgx or GORM | High-performance driver or full ORM for rapid development |
| Testing | Built-in testing package | No external framework needed, benchmarks included |

## Key Libraries
- **slog** -- structured logging (stdlib)
- **cobra** -- CLI argument parsing (if building a CLI)`;

/**
 * Structured description for the Vite + React stack.
 */
const VITE_REACT_DESCRIPTION = `## Stack Overview

| Layer | Choice | Reason |
|---|---|---|
| Build | Vite | Lightning-fast HMR and optimized production builds |
| UI | React 18+ | Component-based UI with concurrent rendering support |
| Styling | Tailwind CSS or CSS Modules | Utility-first styling or scoped CSS depending on preference |
| Routing | React Router | Declarative routing with nested layouts and data loading |
| State | Zustand or Redux Toolkit | Lightweight or full-featured state management |

## Key Libraries
- **TypeScript** -- strict mode throughout
- **Vitest** -- fast Vite-native testing`;

/**
 * Structured description for the Flutter stack.
 */
const FLUTTER_DESCRIPTION = `## Stack Overview

| Layer | Choice | Reason |
|---|---|---|
| Language | Dart | Optimized for UI development with hot reload |
| UI | Flutter widgets | Rich widget library for iOS, Android, and web |
| State | Riverpod or Bloc | Reactive state management with compile-time safety |
| Backend | Firebase or custom API | Serverless backend or connect to any REST/GraphQL API |
| Testing | Flutter test framework | Widget tests, unit tests, and integration tests built-in |

## Key Libraries
- **GoRouter** -- declarative routing with deep link support
- **freezed** -- immutable data classes with union types`;

const STACK_DESCRIPTIONS: Record<Exclude<TechStack, "custom">, string> = {
  "nextjs-supabase": NEXTJS_SUPABASE_DESCRIPTION,
  "react-native": REACT_NATIVE_DESCRIPTION,
  "nodejs-cli": NODEJS_CLI_DESCRIPTION,
  "python-fastapi": PYTHON_FASTAPI_DESCRIPTION,
  "go": GO_DESCRIPTION,
  "vite-react": VITE_REACT_DESCRIPTION,
  "flutter": FLUTTER_DESCRIPTION,
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

/**
 * Definition of Done criteria for the Python (FastAPI) stack.
 */
const PYTHON_FASTAPI_DOD = `## Universal Checks
- [ ] mypy type checking passes with no errors
- [ ] No \`print()\` statements in committed code
- [ ] No commented-out code in committed files
- [ ] Error states handled (proper HTTP error responses)

## Stack-Specific Checks
- [ ] All endpoints return proper HTTP status codes
- [ ] Pydantic models used for request/response validation
- [ ] Database migrations applied and tested locally
- [ ] API docs accessible at \`/docs\`
- [ ] Tests pass with \`pytest\``;

/**
 * Definition of Done criteria for the Go stack.
 */
const GO_DOD = `## Universal Checks
- [ ] Code compiles with \`go build\`
- [ ] \`go vet\` passes with no warnings
- [ ] No \`fmt.Println\` in committed code
- [ ] No commented-out code in committed files
- [ ] Error states handled (no ignored error returns)

## Stack-Specific Checks
- [ ] \`golangci-lint\` passes
- [ ] Error values always checked
- [ ] Context propagated through handlers
- [ ] Tests pass with \`go test ./...\``;

/**
 * Definition of Done criteria for the Vite + React stack.
 */
const VITE_REACT_DOD = `## Universal Checks
- [ ] TypeScript compiles with no errors (\`npx tsc --noEmit\`)
- [ ] No \`any\` types in changed files
- [ ] No \`console.log\` in committed code
- [ ] No commented-out code in committed files
- [ ] Error states handled (loading, empty, error UI)

## Stack-Specific Checks
- [ ] No layout shifts on load
- [ ] Responsive at 375px minimum
- [ ] Route transitions work
- [ ] Build succeeds with \`npm run build\`
- [ ] No runtime errors in browser console`;

/**
 * Definition of Done criteria for the Flutter stack.
 */
const FLUTTER_DOD = `## Universal Checks
- [ ] \`dart analyze\` passes with no errors
- [ ] No \`print()\` in committed code
- [ ] No commented-out code in committed files
- [ ] Error states handled (loading, empty, error UI)

## Stack-Specific Checks
- [ ] Runs on iOS simulator without crash
- [ ] Runs on Android emulator without crash
- [ ] No hardcoded dimensions (use responsive sizing)
- [ ] Widget tests pass with \`flutter test\`
- [ ] Responsive across screen sizes`;

const STACK_DODS: Record<Exclude<TechStack, "custom">, string> = {
  "nextjs-supabase": NEXTJS_SUPABASE_DOD,
  "react-native": REACT_NATIVE_DOD,
  "nodejs-cli": NODEJS_CLI_DOD,
  "python-fastapi": PYTHON_FASTAPI_DOD,
  "go": GO_DOD,
  "vite-react": VITE_REACT_DOD,
  "flutter": FLUTTER_DOD,
};

/**
 * Starter epics for the Next.js + Supabase stack.
 */
const NEXTJS_SUPABASE_EPICS = `## E1 -- Project Setup
**Goal:** Initialize the Next.js app with Tailwind CSS, configure Supabase client, and establish the development environment.
**Status:** Not started
**Tasks:** To be sliced by @meto-pm

---

## E2 -- Auth
**Goal:** Implement sign up, sign in, and sign out using Supabase Auth with row-level security.
**Status:** Not started
**Tasks:** To be sliced by @meto-pm

---

## E3 -- Core Feature
**Goal:** Build the primary feature of the application. To be defined by @meto-pm based on the product vision.
**Status:** Not started
**Tasks:** To be sliced by @meto-pm

---

## E4 -- Deploy
**Goal:** Deploy to Vercel, configure custom domain, and set up environment variables for production.
**Status:** Not started
**Tasks:** To be sliced by @meto-pm`;

/**
 * Starter epics for the React Native stack.
 */
const REACT_NATIVE_EPICS = `## E1 -- Project Setup
**Goal:** Initialize the Expo project with React Navigation and configure the development environment.
**Status:** Not started
**Tasks:** To be sliced by @meto-pm

---

## E2 -- Auth
**Goal:** Implement authentication (sign up, sign in, sign out) with secure token storage.
**Status:** Not started
**Tasks:** To be sliced by @meto-pm

---

## E3 -- Core Feature
**Goal:** Build the primary feature of the application. To be defined by @meto-pm based on the product vision.
**Status:** Not started
**Tasks:** To be sliced by @meto-pm

---

## E4 -- App Store Prep
**Goal:** Prepare the app for App Store and Play Store submission including icons, splash screen, and metadata.
**Status:** Not started
**Tasks:** To be sliced by @meto-pm`;

/**
 * Starter epics for the Node.js CLI stack.
 */
const NODEJS_CLI_EPICS = `## E1 -- CLI Scaffold
**Goal:** Set up the CLI entry point with help text, version flag, and argument parsing.
**Status:** Not started
**Tasks:** To be sliced by @meto-pm

---

## E2 -- Core Command
**Goal:** Implement the primary command that delivers the core value of the CLI tool.
**Status:** Not started
**Tasks:** To be sliced by @meto-pm

---

## E3 -- Testing + CI
**Goal:** Add unit tests, integration tests, and configure continuous integration.
**Status:** Not started
**Tasks:** To be sliced by @meto-pm

---

## E4 -- npm Publish
**Goal:** Prepare for npm publication including package.json metadata, README, and publish workflow.
**Status:** Not started
**Tasks:** To be sliced by @meto-pm`;

/**
 * Starter epics for a custom stack.
 */
const CUSTOM_STACK_EPICS = `## E1 -- Project Setup
**Goal:** Initialize the project structure, install dependencies, and configure the development environment.
**Status:** Not started
**Tasks:** To be sliced by @meto-pm

---

## E2 -- Core Feature
**Goal:** Build the primary feature of the application. To be defined by @meto-pm based on the product vision.
**Status:** Not started
**Tasks:** To be sliced by @meto-pm

---

## E3 -- Testing
**Goal:** Add unit tests and integration tests to ensure quality and enable confident refactoring.
**Status:** Not started
**Tasks:** To be sliced by @meto-pm

---

## E4 -- Deploy
**Goal:** Set up deployment pipeline and ship the first version to production.
**Status:** Not started
**Tasks:** To be sliced by @meto-pm`;

/**
 * Starter epics for the Python (FastAPI) stack.
 */
const PYTHON_FASTAPI_EPICS = `## E1 -- Project Setup
**Goal:** Initialize the FastAPI project with virtual environment, install dependencies, and configure development tooling (mypy, pytest, linter).
**Status:** Not started
**Tasks:** To be sliced by @meto-pm

---

## E2 -- Database + Models
**Goal:** Set up SQLAlchemy with PostgreSQL or SQLite, define initial models, configure Alembic migrations, and create seed data.
**Status:** Not started
**Tasks:** To be sliced by @meto-pm

---

## E3 -- Core API Endpoints
**Goal:** Build the primary API endpoints for the application. To be defined by @meto-pm based on the product vision.
**Status:** Not started
**Tasks:** To be sliced by @meto-pm

---

## E4 -- Deploy
**Goal:** Containerize with Docker, configure cloud hosting, and manage environment variables for production.
**Status:** Not started
**Tasks:** To be sliced by @meto-pm`;

/**
 * Starter epics for the Go stack.
 */
const GO_EPICS = `## E1 -- Project Setup
**Goal:** Initialize the Go module, establish directory structure, and create a Makefile with build, test, and lint targets.
**Status:** Not started
**Tasks:** To be sliced by @meto-pm

---

## E2 -- Core Service
**Goal:** Implement the main HTTP handler or CLI command that delivers the core value of the service.
**Status:** Not started
**Tasks:** To be sliced by @meto-pm

---

## E3 -- Testing + CI
**Goal:** Add unit tests, configure golangci-lint, and set up continuous integration.
**Status:** Not started
**Tasks:** To be sliced by @meto-pm

---

## E4 -- Deploy
**Goal:** Containerize with Docker, configure binary distribution, and set up production deployment.
**Status:** Not started
**Tasks:** To be sliced by @meto-pm`;

/**
 * Starter epics for the Vite + React stack.
 */
const VITE_REACT_EPICS = `## E1 -- Project Setup
**Goal:** Initialize the Vite project with React, configure Tailwind CSS, set up React Router, and establish the development environment.
**Status:** Not started
**Tasks:** To be sliced by @meto-pm

---

## E2 -- Core Feature
**Goal:** Build the primary feature of the application. To be defined by @meto-pm based on the product vision.
**Status:** Not started
**Tasks:** To be sliced by @meto-pm

---

## E3 -- Testing
**Goal:** Add Vitest with React Testing Library for component and integration tests.
**Status:** Not started
**Tasks:** To be sliced by @meto-pm

---

## E4 -- Deploy
**Goal:** Configure static hosting, set up CI/CD pipeline, and optimize production build.
**Status:** Not started
**Tasks:** To be sliced by @meto-pm`;

/**
 * Starter epics for the Flutter stack.
 */
const FLUTTER_EPICS = `## E1 -- Project Setup
**Goal:** Initialize the Flutter project, configure project structure, and set up the app theme and design system.
**Status:** Not started
**Tasks:** To be sliced by @meto-pm

---

## E2 -- Navigation + Routing
**Goal:** Implement navigation with GoRouter or Navigator 2.0, including deep link support.
**Status:** Not started
**Tasks:** To be sliced by @meto-pm

---

## E3 -- Core Feature
**Goal:** Build the primary feature of the application. To be defined by @meto-pm based on the product vision.
**Status:** Not started
**Tasks:** To be sliced by @meto-pm

---

## E4 -- App Store Prep
**Goal:** Prepare app icons, splash screen, metadata, and production builds for App Store and Play Store submission.
**Status:** Not started
**Tasks:** To be sliced by @meto-pm`;

const STACK_EPICS: Record<Exclude<TechStack, "custom">, string> = {
  "nextjs-supabase": NEXTJS_SUPABASE_EPICS,
  "react-native": REACT_NATIVE_EPICS,
  "nodejs-cli": NODEJS_CLI_EPICS,
  "python-fastapi": PYTHON_FASTAPI_EPICS,
  "go": GO_EPICS,
  "vite-react": VITE_REACT_EPICS,
  "flutter": FLUTTER_EPICS,
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
  const heading = `# Epics -- ${projectName}\n\nHigh-level orientation. Full task definitions live in \`tasks-backlog.md\`.\nGenerated by Meto based on stack selection. Refine with @meto-pm.\n\n---\n\n`;

  if (stack === "custom") {
    const note =
      customStack !== undefined
        ? `\n\n---\n\n> Custom stack: ${customStack}. Adjust epics to match your technology choices.`
        : "";
    return heading + CUSTOM_STACK_EPICS + note;
  }

  return heading + STACK_EPICS[stack];
}
