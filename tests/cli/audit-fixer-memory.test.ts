import { describe, it, expect } from "vitest";
import { setProjectMemory } from "../../src/cli/audit/fixer.js";

describe("setProjectMemory", () => {
  it("replaces the memory: false older scaffolds wrote", () => {
    const before =
      "---\nname: meto-developer\ntools: Read, Write\nmemory: false\n---\n\n# Developer Agent\n";
    expect(setProjectMemory(before)).toBe(
      "---\nname: meto-developer\ntools: Read, Write\nmemory: project\n---\n\n# Developer Agent\n",
    );
  });

  it("adds the line when the frontmatter has no memory field", () => {
    const before = "---\nname: meto-pm\ntools: Read\n---\n\nBody\n";
    expect(setProjectMemory(before)).toBe(
      "---\nname: meto-pm\ntools: Read\nmemory: project\n---\n\nBody\n",
    );
  });

  it("keeps CRLF line endings", () => {
    const before = "---\r\nname: meto-tester\r\n---\r\n\r\nBody\r\n";
    expect(setProjectMemory(before)).toBe(
      "---\r\nname: meto-tester\r\nmemory: project\r\n---\r\n\r\nBody\r\n",
    );
  });

  it("leaves a memory mention in the body alone", () => {
    const before = "---\nname: meto-pm\n---\n\nmemory: false is not valid\n";
    expect(setProjectMemory(before)).toBe(
      "---\nname: meto-pm\nmemory: project\n---\n\nmemory: false is not valid\n",
    );
  });

  it("returns undefined for a file without frontmatter", () => {
    expect(setProjectMemory("# Developer Agent\n")).toBeUndefined();
  });
});
