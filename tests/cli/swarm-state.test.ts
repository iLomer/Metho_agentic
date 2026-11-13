import { describe, it, expect } from "vitest";
import {
  buildSwarmState,
  parseBoardSlices,
  parseDomainOwns,
} from "../../src/cli/swarm-state.js";
import { generateStackRules } from "../../src/cli/scaffold/stack-rules.js";
import { getCodeGuidelines } from "../../src/cli/stacks.js";

const SWARM = `# SWARM_AWARENESS — shop

## [swarm:meta]
- **Project:** shop
- **Mode:** swarm

## [swarm:epics]

| Epic ID | Name | Agent | Status | Tasks Done | Blocker |
|---|---|---|---|---|---|
| E1 | Auth | meto-epic-E1 | on-track | 2 | none |
| E2 | Checkout | meto-epic-E2 | testing-ready | 5 | none |
| E3 | Emails | meto-epic-E3 | not-started | 0 | none |
`;

const DOMAIN_MAP = `# Domain Map — shop

## Epic Domains

| Epic ID | Epic Name | Owns | Shared With |
|---|---|---|---|
| E1 | Auth | \`src/auth/\`, \`supabase/migrations/*_auth_*.sql\` | none |
| E2 | Checkout | src/checkout, src/cart | none |
| E3 | Emails | *(paths)* | none |

## Shared Files (requires coordination)

| File | Reason shared | Protocol |
|---|---|---|
| \`package.json\` | deps | flag |
`;

const TODO = `# Tasks Todo

## [slice-010] -- Add RLS policy
**Epic:** E1 | **Size:** M | **Depends on:** none
**Model:** opus

## [slice-011] -- Login copy
**Epic:** E1 | **Size:** XS | **Depends on:** none
**Model:** haiku
**Needs:** slice-009

## [slice-020] -- Welcome email
**Epic:** E3 | **Size:** S | **Depends on:** none
`;

describe("parseBoardSlices", () => {
  it("reads id, epic, model and needs", () => {
    expect(parseBoardSlices(TODO)).toEqual([
      { id: "slice-010", epic: "E1", model: "opus", needs: [] },
      { id: "slice-011", epic: "E1", model: "haiku", needs: ["slice-009"] },
      { id: "slice-020", epic: "E3", model: undefined, needs: [] },
    ]);
  });
});

describe("parseDomainOwns", () => {
  it("reads backticked and comma-separated paths and skips placeholders", () => {
    expect(parseDomainOwns(DOMAIN_MAP)).toEqual({
      E1: ["src/auth/", "supabase/migrations/*_auth_*.sql"],
      E2: ["src/checkout", "src/cart"],
    });
  });
});

describe("buildSwarmState", () => {
  it("combines the swarm table, the domain map and the board", () => {
    const state = buildSwarmState({
      swarm: SWARM,
      domainMap: DOMAIN_MAP,
      todo: TODO,
      inProgress: "## [slice-009] -- Session table\n**Epic:** E1 | **Size:** M\n",
      inTesting: "## [slice-015] -- Cart total\n**Epic:** E2 | **Size:** M\n",
    });

    expect(state.project).toBe("shop");
    expect(state.epics).toEqual([
      {
        id: "E1",
        name: "Auth",
        status: "on-track",
        owns: ["src/auth/", "supabase/migrations/*_auth_*.sql"],
        todo: 2,
        inProgress: 1,
        inTesting: 0,
        waitingOn: ["slice-009"],
        model: "opus",
      },
      {
        id: "E2",
        name: "Checkout",
        status: "testing-ready",
        owns: ["src/checkout", "src/cart"],
        todo: 0,
        inProgress: 0,
        inTesting: 1,
        waitingOn: [],
        model: "none",
      },
      {
        id: "E3",
        name: "Emails",
        status: "not-started",
        owns: [],
        todo: 1,
        inProgress: 0,
        inTesting: 0,
        waitingOn: [],
        model: "none",
      },
    ]);
  });
});

describe("generateStackRules", () => {
  it("writes path-scoped frontmatter and the stack's rules", () => {
    const rules = generateStackRules("python-fastapi") ?? "";
    expect(rules.startsWith('---\npaths:\n  - "**/*.py"\n---\n')).toBe(true);
    expect(rules).toContain("# Python / FastAPI rules");
    expect(rules).toContain("Pydantic models for all I/O");
    expect(rules).not.toContain("## Stack-Specific Guidelines");
  });

  it("scopes Next.js + Supabase rules to TypeScript and the supabase folder", () => {
    const rules = generateStackRules("nextjs-supabase") ?? "";
    expect(rules).toContain('  - "**/*.{ts,tsx}"');
    expect(rules).toContain('  - "supabase/**"');
  });

  it("has no rule file for a custom stack", () => {
    expect(generateStackRules("custom")).toBeUndefined();
  });

  it("leaves a pointer, not the rules, in code-guidelines.md", () => {
    const pointer = getCodeGuidelines("go");
    expect(pointer).toContain(".claude/rules/stack.md");
    expect(pointer).not.toContain("Accept interfaces");
  });
});
