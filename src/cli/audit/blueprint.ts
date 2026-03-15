/**
 * Declarative blueprint that defines what each audit layer expects.
 * The scanner reads this data structure to determine which checks to run.
 * Adding new checks is data-driven: add an entry here, the scanner picks it up.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** The kind of filesystem check the scanner should perform. */
export type CheckType =
  | "file-exists"
  | "dir-exists"
  | "file-contains"
  | "custom";

/**
 * A single expectation within a layer.
 * Describes one thing the scanner should verify.
 */
export interface BlueprintExpectation {
  /** Unique identifier (e.g. "L0-git", "L1-claude-md") */
  id: string;
  /** Human-readable description shown in reports */
  description: string;
  /** What kind of check the scanner should perform */
  checkType: CheckType;
  /**
   * Relative path (from project root) the check targets.
   * For "custom" checks this may be a hint or pattern rather than a literal path.
   */
  path: string;
  /** Which layer this expectation belongs to (0, 1, 2, 3) */
  layer: number;
  /** Whether the fixer can automatically resolve a failure */
  fixable: boolean;
  /**
   * For "file-contains" checks: the pattern (substring or heading) expected
   * inside the file. Ignored for other check types.
   */
  containsPattern?: string;
}

/**
 * A layer groups related expectations under a name and numeric id.
 * Layers are ordered: higher layers gate on lower layers passing.
 */
export interface BlueprintLayer {
  /** Numeric layer identifier (0, 1, 2, 3) */
  id: number;
  /** Human-readable layer name */
  name: string;
  /** Ordered list of expectations for this layer */
  expectations: BlueprintExpectation[];
}

// ---------------------------------------------------------------------------
// Layer 0 -- Project Prerequisites
// ---------------------------------------------------------------------------

const LAYER_0_EXPECTATIONS: BlueprintExpectation[] = [
  {
    id: "L0-git",
    description: "Git initialized",
    checkType: "dir-exists",
    path: ".git",
    layer: 0,
    fixable: false,
  },
  {
    id: "L0-readme",
    description: "README exists",
    checkType: "custom",
    path: "README*",
    layer: 0,
    fixable: false,
  },
  {
    id: "L0-source-dir",
    description: "Source code directory exists",
    checkType: "custom",
    path: "src|lib|app|pkg|cmd|internal",
    layer: 0,
    fixable: false,
  },
];

// ---------------------------------------------------------------------------
// Layer 1 -- Methodology
// ---------------------------------------------------------------------------

const LAYER_1_EXPECTATIONS: BlueprintExpectation[] = [
  {
    id: "L1-claude-md",
    description: "CLAUDE.md project instructions",
    checkType: "file-exists",
    path: "CLAUDE.md",
    layer: 1,
    fixable: true,
  },
  {
    id: "L1-ai-dir",
    description: "ai/ directory",
    checkType: "dir-exists",
    path: "ai",
    layer: 1,
    fixable: true,
  },
  {
    id: "L1-context-dir",
    description: "ai/context/ directory",
    checkType: "dir-exists",
    path: "ai/context",
    layer: 1,
    fixable: true,
  },
  {
    id: "L1-product-vision",
    description: "Product vision document",
    checkType: "file-exists",
    path: "ai/context/product-vision.md",
    layer: 1,
    fixable: true,
  },
  {
    id: "L1-tech-stack",
    description: "Tech stack document",
    checkType: "file-exists",
    path: "ai/context/tech-stack.md",
    layer: 1,
    fixable: true,
  },
  {
    id: "L1-decisions",
    description: "Decisions log",
    checkType: "file-exists",
    path: "ai/context/decisions.md",
    layer: 1,
    fixable: true,
  },
  {
    id: "L1-tasks-dir",
    description: "ai/tasks/ directory",
    checkType: "dir-exists",
    path: "ai/tasks",
    layer: 1,
    fixable: true,
  },
  {
    id: "L1-tasks-backlog",
    description: "Task board: backlog",
    checkType: "file-exists",
    path: "ai/tasks/tasks-backlog.md",
    layer: 1,
    fixable: true,
  },
  {
    id: "L1-tasks-todo",
    description: "Task board: todo",
    checkType: "file-exists",
    path: "ai/tasks/tasks-todo.md",
    layer: 1,
    fixable: true,
  },
  {
    id: "L1-tasks-in-progress",
    description: "Task board: in-progress",
    checkType: "file-exists",
    path: "ai/tasks/tasks-in-progress.md",
    layer: 1,
    fixable: true,
  },
  {
    id: "L1-tasks-in-testing",
    description: "Task board: in-testing",
    checkType: "file-exists",
    path: "ai/tasks/tasks-in-testing.md",
    layer: 1,
    fixable: true,
  },
  {
    id: "L1-tasks-done",
    description: "Task board: done",
    checkType: "file-exists",
    path: "ai/tasks/tasks-done.md",
    layer: 1,
    fixable: true,
  },
  {
    id: "L1-workflows-dir",
    description: "ai/workflows/ directory",
    checkType: "dir-exists",
    path: "ai/workflows",
    layer: 1,
    fixable: true,
  },
  {
    id: "L1-definition-of-done",
    description: "Definition of done workflow",
    checkType: "file-exists",
    path: "ai/workflows/definition-of-done.md",
    layer: 1,
    fixable: true,
  },
  {
    id: "L1-commit-conventions",
    description: "Commit conventions workflow",
    checkType: "file-exists",
    path: "ai/workflows/commit-conventions.md",
    layer: 1,
    fixable: true,
  },
];

// ---------------------------------------------------------------------------
// Layer 2 -- Agents
// ---------------------------------------------------------------------------

const LAYER_2_EXPECTATIONS: BlueprintExpectation[] = [
  {
    id: "L2-claude-dir",
    description: ".claude/ directory",
    checkType: "dir-exists",
    path: ".claude",
    layer: 2,
    fixable: true,
  },
  {
    id: "L2-settings-json",
    description: "Agent settings (.claude/settings.json)",
    checkType: "file-exists",
    path: ".claude/settings.json",
    layer: 2,
    fixable: true,
  },
  {
    id: "L2-agents-dir",
    description: ".claude/agents/ directory",
    checkType: "dir-exists",
    path: ".claude/agents",
    layer: 2,
    fixable: true,
  },
  {
    id: "L2-pm-agent",
    description: "PM agent definition",
    checkType: "file-exists",
    path: ".claude/agents/pm-agent.md",
    layer: 2,
    fixable: true,
  },
  {
    id: "L2-developer-agent",
    description: "Developer agent definition",
    checkType: "file-exists",
    path: ".claude/agents/developer-agent.md",
    layer: 2,
    fixable: true,
  },
  {
    id: "L2-tester-agent",
    description: "Tester agent definition",
    checkType: "file-exists",
    path: ".claude/agents/tester-agent.md",
    layer: 2,
    fixable: true,
  },
  {
    id: "L2-agent-memory-dir",
    description: ".claude/agent-memory/ directory",
    checkType: "dir-exists",
    path: ".claude/agent-memory",
    layer: 2,
    fixable: true,
  },
  {
    id: "L2-pm-memory",
    description: "PM agent memory directory",
    checkType: "dir-exists",
    path: ".claude/agent-memory/meto-pm",
    layer: 2,
    fixable: true,
  },
  {
    id: "L2-developer-memory",
    description: "Developer agent memory directory",
    checkType: "dir-exists",
    path: ".claude/agent-memory/meto-developer",
    layer: 2,
    fixable: true,
  },
  {
    id: "L2-tester-memory",
    description: "Tester agent memory directory",
    checkType: "dir-exists",
    path: ".claude/agent-memory/meto-tester",
    layer: 2,
    fixable: true,
  },
];

// ---------------------------------------------------------------------------
// Layer 3 -- Governance
// ---------------------------------------------------------------------------

const LAYER_3_EXPECTATIONS: BlueprintExpectation[] = [
  {
    id: "L3-dod-exists",
    description: "Definition of done workflow exists",
    checkType: "file-exists",
    path: "ai/workflows/definition-of-done.md",
    layer: 3,
    fixable: true,
  },
  {
    id: "L3-commit-conventions-defined",
    description: "Commit conventions defined",
    checkType: "file-contains",
    path: "CLAUDE.md",
    layer: 3,
    fixable: true,
    containsPattern: "Commit",
  },
  {
    id: "L3-session-checkpoint",
    description: "Session checkpoint workflow present",
    checkType: "file-exists",
    path: "ai/workflows/session-checkpoint.md",
    layer: 3,
    fixable: true,
  },
  {
    id: "L3-pm-agent-refs-dod",
    description: "PM agent references definition of done",
    checkType: "file-contains",
    path: ".claude/agents/pm-agent.md",
    layer: 3,
    fixable: true,
    containsPattern: "definition-of-done",
  },
  {
    id: "L3-developer-agent-refs-commit",
    description: "Developer agent references commit conventions",
    checkType: "file-contains",
    path: ".claude/agents/developer-agent.md",
    layer: 3,
    fixable: true,
    containsPattern: "commit",
  },
  {
    id: "L3-tester-agent-refs-dod",
    description: "Tester agent references definition of done",
    checkType: "file-contains",
    path: ".claude/agents/tester-agent.md",
    layer: 3,
    fixable: true,
    containsPattern: "definition-of-done",
  },
  {
    id: "L3-pm-agent-refs-memory",
    description: "PM agent references memory file",
    checkType: "file-contains",
    path: ".claude/agents/pm-agent.md",
    layer: 3,
    fixable: true,
    containsPattern: "agent-memory",
  },
  {
    id: "L3-developer-agent-refs-memory",
    description: "Developer agent references memory file",
    checkType: "file-contains",
    path: ".claude/agents/developer-agent.md",
    layer: 3,
    fixable: true,
    containsPattern: "agent-memory",
  },
  {
    id: "L3-tester-agent-refs-memory",
    description: "Tester agent references memory file",
    checkType: "file-contains",
    path: ".claude/agents/tester-agent.md",
    layer: 3,
    fixable: true,
    containsPattern: "agent-memory",
  },
];

// ---------------------------------------------------------------------------
// Blueprint (all layers)
// ---------------------------------------------------------------------------

/**
 * The complete audit blueprint. Layers are ordered; the scanner should
 * evaluate them sequentially and gate higher layers on lower ones passing.
 *
 * Exported as a constant -- no runtime construction.
 */
export const AUDIT_BLUEPRINT: readonly BlueprintLayer[] = [
  {
    id: 0,
    name: "Project Prerequisites",
    expectations: LAYER_0_EXPECTATIONS,
  },
  {
    id: 1,
    name: "Methodology",
    expectations: LAYER_1_EXPECTATIONS,
  },
  {
    id: 2,
    name: "Agents",
    expectations: LAYER_2_EXPECTATIONS,
  },
  {
    id: 3,
    name: "Governance",
    expectations: LAYER_3_EXPECTATIONS,
  },
] as const;
