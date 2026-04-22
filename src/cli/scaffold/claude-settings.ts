import type { TechStack } from "../types.js";

const UNIVERSAL_ALLOWS: string[] = [
  "Read",
  "Edit",
  "Write",
  "Glob",
  "Grep",
  "Bash(git *)",
  "Bash(ls *)",
  "Bash(cat *)",
  "Bash(echo *)",
  "Bash(mkdir *)",
  "Bash(cp *)",
  "Bash(mv *)",
  "Bash(rm *)",
  "Bash(find *)",
  "Bash(which *)",
  "Bash(pwd)",
  "Bash(cd *)",
];

const NODE_TS_ALLOWS: string[] = [
  "Bash(npm run *)",
  "Bash(npm test)",
  "Bash(npx tsc *)",
  "Bash(npx vitest *)",
  "Bash(npx *)",
  "Bash(node *)",
];

const PYTHON_ALLOWS: string[] = [
  "Bash(pytest *)",
  "Bash(pip install *)",
  "Bash(pip *)",
  "Bash(python *)",
  "Bash(uv *)",
  "Bash(uvicorn *)",
  "Bash(alembic *)",
];

const GO_ALLOWS: string[] = [
  "Bash(go test *)",
  "Bash(go build *)",
  "Bash(go run *)",
  "Bash(go fmt *)",
  "Bash(go vet *)",
  "Bash(golangci-lint *)",
];

const FLUTTER_ALLOWS: string[] = [
  "Bash(flutter test)",
  "Bash(flutter pub *)",
  "Bash(flutter run *)",
  "Bash(flutter build *)",
  "Bash(dart *)",
  "Bash(fvm *)",
];

function getStackSpecificAllows(stack: TechStack): string[] {
  switch (stack) {
    case "nodejs-cli":
    case "nextjs-supabase":
    case "vite-react":
    case "react-native":
      return NODE_TS_ALLOWS;
    case "python-fastapi":
      return PYTHON_ALLOWS;
    case "go":
      return GO_ALLOWS;
    case "flutter":
      return FLUTTER_ALLOWS;
    case "custom":
      return [];
  }
}

/**
 * Generates a `.claude/settings.json` content string pre-configured with
 * the permission allowlist for the given tech stack.
 */
export function generateClaudeSettings(stack: TechStack): string {
  const allow = [...UNIVERSAL_ALLOWS, ...getStackSpecificAllows(stack)];
  const settings = {
    env: {
      CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: "1",
    },
    permissions: {
      allow,
    },
  };
  return JSON.stringify(settings, null, 2);
}
