import { describe, it, expect } from "vitest";
import { generateClaudeSettings } from "../../../src/cli/scaffold/claude-settings.js";
import type { TechStack } from "../../../src/cli/types.js";

const UNIVERSAL_ALLOWS = [
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

const NODE_ALLOWS = [
  "Bash(npm run *)",
  "Bash(npm test)",
  "Bash(npx tsc *)",
  "Bash(npx vitest *)",
  "Bash(npx *)",
  "Bash(node *)",
];

describe("generateClaudeSettings", () => {
  it("returns valid JSON for every stack", () => {
    const stacks: TechStack[] = [
      "nodejs-cli",
      "nextjs-supabase",
      "react-native",
      "vite-react",
      "python-fastapi",
      "go",
      "flutter",
      "custom",
    ];
    for (const stack of stacks) {
      expect(() => JSON.parse(generateClaudeSettings(stack))).not.toThrow();
    }
  });

  it("includes all universal allows for every stack", () => {
    const stacks: TechStack[] = [
      "nodejs-cli",
      "nextjs-supabase",
      "react-native",
      "vite-react",
      "python-fastapi",
      "go",
      "flutter",
      "custom",
    ];
    for (const stack of stacks) {
      const parsed = JSON.parse(generateClaudeSettings(stack)) as {
        permissions: { allow: string[] };
      };
      for (const entry of UNIVERSAL_ALLOWS) {
        expect(parsed.permissions.allow, `stack=${stack} missing ${entry}`).toContain(entry);
      }
    }
  });

  it("adds Node/TS entries for nodejs-cli", () => {
    const parsed = JSON.parse(generateClaudeSettings("nodejs-cli")) as {
      permissions: { allow: string[] };
    };
    for (const entry of NODE_ALLOWS) {
      expect(parsed.permissions.allow).toContain(entry);
    }
  });

  it("adds Node/TS entries for nextjs-supabase", () => {
    const parsed = JSON.parse(generateClaudeSettings("nextjs-supabase")) as {
      permissions: { allow: string[] };
    };
    for (const entry of NODE_ALLOWS) {
      expect(parsed.permissions.allow).toContain(entry);
    }
  });

  it("adds Node/TS entries for vite-react", () => {
    const parsed = JSON.parse(generateClaudeSettings("vite-react")) as {
      permissions: { allow: string[] };
    };
    for (const entry of NODE_ALLOWS) {
      expect(parsed.permissions.allow).toContain(entry);
    }
  });

  it("adds Node/TS entries for react-native", () => {
    const parsed = JSON.parse(generateClaudeSettings("react-native")) as {
      permissions: { allow: string[] };
    };
    for (const entry of NODE_ALLOWS) {
      expect(parsed.permissions.allow).toContain(entry);
    }
  });

  it("adds Python entries for python-fastapi", () => {
    const parsed = JSON.parse(generateClaudeSettings("python-fastapi")) as {
      permissions: { allow: string[] };
    };
    const pythonEntries = [
      "Bash(pytest *)",
      "Bash(pip install *)",
      "Bash(pip *)",
      "Bash(python *)",
      "Bash(uv *)",
      "Bash(uvicorn *)",
      "Bash(alembic *)",
    ];
    for (const entry of pythonEntries) {
      expect(parsed.permissions.allow).toContain(entry);
    }
  });

  it("adds Go entries for go", () => {
    const parsed = JSON.parse(generateClaudeSettings("go")) as {
      permissions: { allow: string[] };
    };
    const goEntries = [
      "Bash(go test *)",
      "Bash(go build *)",
      "Bash(go run *)",
      "Bash(go fmt *)",
      "Bash(go vet *)",
      "Bash(golangci-lint *)",
    ];
    for (const entry of goEntries) {
      expect(parsed.permissions.allow).toContain(entry);
    }
  });

  it("adds Flutter entries for flutter", () => {
    const parsed = JSON.parse(generateClaudeSettings("flutter")) as {
      permissions: { allow: string[] };
    };
    const flutterEntries = [
      "Bash(flutter test)",
      "Bash(flutter pub *)",
      "Bash(flutter run *)",
      "Bash(flutter build *)",
      "Bash(dart *)",
      "Bash(fvm *)",
    ];
    for (const entry of flutterEntries) {
      expect(parsed.permissions.allow).toContain(entry);
    }
  });

  it("returns only universal entries for custom stack", () => {
    const parsed = JSON.parse(generateClaudeSettings("custom")) as {
      permissions: { allow: string[] };
    };
    expect(parsed.permissions.allow).toHaveLength(UNIVERSAL_ALLOWS.length);
    for (const entry of UNIVERSAL_ALLOWS) {
      expect(parsed.permissions.allow).toContain(entry);
    }
  });

  it("does not add Node entries for python-fastapi", () => {
    const parsed = JSON.parse(generateClaudeSettings("python-fastapi")) as {
      permissions: { allow: string[] };
    };
    expect(parsed.permissions.allow).not.toContain("Bash(npm run *)");
  });

  it("does not add Python entries for go", () => {
    const parsed = JSON.parse(generateClaudeSettings("go")) as {
      permissions: { allow: string[] };
    };
    expect(parsed.permissions.allow).not.toContain("Bash(python *)");
  });

  it("output has a permissions.allow array", () => {
    const parsed = JSON.parse(generateClaudeSettings("nodejs-cli")) as Record<string, unknown>;
    expect(parsed).toHaveProperty("permissions");
    const perms = parsed.permissions as Record<string, unknown>;
    expect(Array.isArray(perms.allow)).toBe(true);
  });
});
