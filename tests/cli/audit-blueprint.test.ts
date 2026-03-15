import { describe, it, expect } from "vitest";
import {
  AUDIT_BLUEPRINT,
  type BlueprintExpectation,
  type BlueprintLayer,
  type CheckType,
} from "../../src/cli/audit/blueprint.js";

describe("AUDIT_BLUEPRINT structure", () => {
  it("has exactly 4 layers (0, 1, 2, 3)", () => {
    expect(AUDIT_BLUEPRINT).toHaveLength(4);
    expect(AUDIT_BLUEPRINT.map((l) => l.id)).toEqual([0, 1, 2, 3]);
  });

  it("layers are named correctly", () => {
    const names = AUDIT_BLUEPRINT.map((l) => l.name);
    expect(names).toEqual([
      "Project Prerequisites",
      "Methodology",
      "Agents",
      "Governance",
    ]);
  });

  it("each layer has a non-empty expectations array", () => {
    for (const layer of AUDIT_BLUEPRINT) {
      expect(layer.expectations.length).toBeGreaterThan(0);
    }
  });

  it("Layer 0 has 3 expectations", () => {
    expect(AUDIT_BLUEPRINT[0].expectations).toHaveLength(3);
  });

  it("Layer 1 has 15 expectations", () => {
    expect(AUDIT_BLUEPRINT[1].expectations).toHaveLength(15);
  });

  it("Layer 2 has 10 expectations", () => {
    expect(AUDIT_BLUEPRINT[2].expectations).toHaveLength(10);
  });

  it("Layer 3 has 9 expectations", () => {
    expect(AUDIT_BLUEPRINT[3].expectations).toHaveLength(9);
  });
});

describe("BlueprintExpectation required fields", () => {
  const allExpectations: BlueprintExpectation[] = AUDIT_BLUEPRINT.flatMap(
    (l) => l.expectations,
  );

  const validCheckTypes: CheckType[] = [
    "file-exists",
    "dir-exists",
    "file-contains",
    "custom",
  ];

  it("every expectation has a non-empty id", () => {
    for (const exp of allExpectations) {
      expect(exp.id).toBeTruthy();
      expect(typeof exp.id).toBe("string");
    }
  });

  it("every expectation has a non-empty description", () => {
    for (const exp of allExpectations) {
      expect(exp.description).toBeTruthy();
      expect(typeof exp.description).toBe("string");
    }
  });

  it("every expectation has a valid checkType", () => {
    for (const exp of allExpectations) {
      expect(validCheckTypes).toContain(exp.checkType);
    }
  });

  it("every expectation has a non-empty path", () => {
    for (const exp of allExpectations) {
      expect(exp.path).toBeTruthy();
      expect(typeof exp.path).toBe("string");
    }
  });

  it("every expectation has a layer number matching its parent layer", () => {
    for (const layer of AUDIT_BLUEPRINT) {
      for (const exp of layer.expectations) {
        expect(exp.layer).toBe(layer.id);
      }
    }
  });

  it("every expectation has a boolean fixable field", () => {
    for (const exp of allExpectations) {
      expect(typeof exp.fixable).toBe("boolean");
    }
  });

  it("all expectation IDs are unique", () => {
    const ids = allExpectations.map((e) => e.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("file-contains expectations always have a containsPattern", () => {
    const fileContainsExpectations = allExpectations.filter(
      (e) => e.checkType === "file-contains",
    );
    expect(fileContainsExpectations.length).toBeGreaterThan(0);
    for (const exp of fileContainsExpectations) {
      expect(exp.containsPattern).toBeTruthy();
    }
  });
});

describe("Layer 0 specifics", () => {
  const layer0 = AUDIT_BLUEPRINT[0];

  it("all Layer 0 expectations are not fixable", () => {
    for (const exp of layer0.expectations) {
      expect(exp.fixable).toBe(false);
    }
  });

  it("has git, readme, and source-dir checks", () => {
    const ids = layer0.expectations.map((e) => e.id);
    expect(ids).toContain("L0-git");
    expect(ids).toContain("L0-readme");
    expect(ids).toContain("L0-source-dir");
  });

  it("readme and source-dir use custom check type", () => {
    const readme = layer0.expectations.find((e) => e.id === "L0-readme");
    const sourceDir = layer0.expectations.find(
      (e) => e.id === "L0-source-dir",
    );
    expect(readme?.checkType).toBe("custom");
    expect(sourceDir?.checkType).toBe("custom");
  });
});

describe("Layer 1 specifics", () => {
  const layer1 = AUDIT_BLUEPRINT[1];

  it("all Layer 1 expectations are fixable", () => {
    for (const exp of layer1.expectations) {
      expect(exp.fixable).toBe(true);
    }
  });

  it("includes CLAUDE.md check", () => {
    const claudeMd = layer1.expectations.find(
      (e) => e.id === "L1-claude-md",
    );
    expect(claudeMd).toBeDefined();
    expect(claudeMd?.checkType).toBe("file-exists");
    expect(claudeMd?.path).toBe("CLAUDE.md");
  });

  it("includes all 5 board files", () => {
    const boardIds = layer1.expectations
      .filter((e) => e.id.startsWith("L1-tasks-"))
      .map((e) => e.id);
    expect(boardIds).toHaveLength(6); // tasks-dir + 5 board files
  });
});

describe("Layer 2 specifics", () => {
  const layer2 = AUDIT_BLUEPRINT[2];

  it("all Layer 2 expectations are fixable", () => {
    for (const exp of layer2.expectations) {
      expect(exp.fixable).toBe(true);
    }
  });

  it("includes agent definition files", () => {
    const agentFiles = layer2.expectations.filter(
      (e) =>
        e.id === "L2-pm-agent" ||
        e.id === "L2-developer-agent" ||
        e.id === "L2-tester-agent",
    );
    expect(agentFiles).toHaveLength(3);
    for (const a of agentFiles) {
      expect(a.checkType).toBe("file-exists");
    }
  });

  it("includes agent memory directories", () => {
    const memoryDirs = layer2.expectations.filter(
      (e) =>
        e.id === "L2-pm-memory" ||
        e.id === "L2-developer-memory" ||
        e.id === "L2-tester-memory",
    );
    expect(memoryDirs).toHaveLength(3);
    for (const m of memoryDirs) {
      expect(m.checkType).toBe("dir-exists");
    }
  });
});

describe("Layer 3 specifics", () => {
  const layer3 = AUDIT_BLUEPRINT[3];

  it("all Layer 3 expectations are fixable", () => {
    for (const exp of layer3.expectations) {
      expect(exp.fixable).toBe(true);
    }
  });

  it("has file-contains checks with containsPattern", () => {
    const containsChecks = layer3.expectations.filter(
      (e) => e.checkType === "file-contains",
    );
    expect(containsChecks.length).toBeGreaterThan(0);
    for (const c of containsChecks) {
      expect(c.containsPattern).toBeTruthy();
    }
  });

  it("references definition-of-done in agent checks", () => {
    const dodRefs = layer3.expectations.filter((e) =>
      e.id.includes("refs-dod"),
    );
    expect(dodRefs).toHaveLength(2); // PM and Tester
    for (const d of dodRefs) {
      expect(d.containsPattern).toBe("definition-of-done");
    }
  });

  it("references agent-memory in agent checks", () => {
    const memRefs = layer3.expectations.filter((e) =>
      e.id.includes("refs-memory"),
    );
    expect(memRefs).toHaveLength(3); // PM, Developer, Tester
    for (const m of memRefs) {
      expect(m.containsPattern).toBe("agent-memory");
    }
  });
});
