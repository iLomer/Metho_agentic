import { describe, it, expect } from "vitest";
import { getReadyTasks } from "../../../src/cli/board/resolver.js";
import path from "path";
import os from "os";
import fs from "fs/promises";

// ---- fixture helpers ----

async function makeTmpDir(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), "meto-resolver-test-"));
}

async function writeTodoFile(dir: string, content: string): Promise<string> {
  const filePath = path.join(dir, "tasks-todo.md");
  await fs.writeFile(filePath, content, "utf-8");
  return filePath;
}

async function writeDoneFile(dir: string, content: string): Promise<string> {
  const filePath = path.join(dir, "tasks-done.md");
  await fs.writeFile(filePath, content, "utf-8");
  return filePath;
}

// ---- fixture content ----

const TODO_NO_DEPS = `# Tasks — Todo

---

## [slice-101] -- First task
**Epic:** E27 | **Size:** S | **Depends on:** none

User story here.

---

## [slice-102] -- Second task
**Epic:** E27 | **Size:** S | **Depends on:** none

User story here.

---
`;

const TODO_WITH_DEPS = `# Tasks — Todo

---

## [slice-101] -- Task with no deps
**Epic:** E27 | **Size:** S | **Depends on:** none

User story here.

---

## [slice-102] -- Task needs 050
**Epic:** E27 | **Size:** S | **Depends on:** slice-050
**Needs:** slice-050

User story here.

---

## [slice-103] -- Task needs 050 and 051
**Epic:** E27 | **Size:** S | **Depends on:** slice-050, slice-051
**Needs:** slice-050, slice-051

User story here.

---
`;

const TODO_ALL_BLOCKED = `# Tasks — Todo

---

## [slice-200] -- Blocked task A
**Epic:** E30 | **Size:** S | **Depends on:** slice-199
**Needs:** slice-199

User story here.

---

## [slice-201] -- Blocked task B
**Epic:** E30 | **Size:** S | **Depends on:** slice-198
**Needs:** slice-198, slice-199

User story here.

---
`;

const DONE_WITH_050 = `# Tasks — Done

---

## [slice-050] -- Completed task
**Epic:** E20 | **Size:** S | **Depends on:** none

User story here.

---
`;

const DONE_WITH_050_AND_051 = `# Tasks — Done

---

## [slice-050] -- Completed task A
**Epic:** E20 | **Size:** S | **Depends on:** none

User story here.

---

## [slice-051] -- Completed task B
**Epic:** E20 | **Size:** S | **Depends on:** none

User story here.

---
`;

// ---- tests ----

describe("getReadyTasks", () => {
  describe("all tasks ready (no deps)", () => {
    it("returns all tasks when none have needs", async () => {
      const dir = await makeTmpDir();
      const todoPath = await writeTodoFile(dir, TODO_NO_DEPS);
      const donePath = await writeDoneFile(dir, "# Done\n\n---\n");

      const result = await getReadyTasks(todoPath, donePath);
      expect(result.map((t) => t.sliceId)).toEqual(["slice-101", "slice-102"]);
    });

    it("preserves task order from tasks-todo.md", async () => {
      const dir = await makeTmpDir();
      const todoPath = await writeTodoFile(dir, TODO_NO_DEPS);
      const donePath = await writeDoneFile(dir, "# Done\n\n---\n");

      const result = await getReadyTasks(todoPath, donePath);
      expect(result[0].sliceId).toBe("slice-101");
      expect(result[1].sliceId).toBe("slice-102");
    });
  });

  describe("subset of tasks ready", () => {
    it("returns only tasks whose needs are all in done set", async () => {
      const dir = await makeTmpDir();
      const todoPath = await writeTodoFile(dir, TODO_WITH_DEPS);
      const donePath = await writeDoneFile(dir, DONE_WITH_050);

      const result = await getReadyTasks(todoPath, donePath);
      // slice-101 (no needs) + slice-102 (needs slice-050, present) -- slice-103 needs slice-051 (absent)
      expect(result.map((t) => t.sliceId)).toEqual(["slice-101", "slice-102"]);
    });

    it("returns all three when both deps are satisfied", async () => {
      const dir = await makeTmpDir();
      const todoPath = await writeTodoFile(dir, TODO_WITH_DEPS);
      const donePath = await writeDoneFile(dir, DONE_WITH_050_AND_051);

      const result = await getReadyTasks(todoPath, donePath);
      expect(result.map((t) => t.sliceId)).toEqual([
        "slice-101",
        "slice-102",
        "slice-103",
      ]);
    });

    it("returns only the no-needs task when done set is empty", async () => {
      const dir = await makeTmpDir();
      const todoPath = await writeTodoFile(dir, TODO_WITH_DEPS);
      const donePath = await writeDoneFile(dir, "# Done\n\n---\n");

      const result = await getReadyTasks(todoPath, donePath);
      expect(result.map((t) => t.sliceId)).toEqual(["slice-101"]);
    });
  });

  describe("none ready", () => {
    it("returns empty array when all tasks have unmet needs", async () => {
      const dir = await makeTmpDir();
      const todoPath = await writeTodoFile(dir, TODO_ALL_BLOCKED);
      const donePath = await writeDoneFile(dir, "# Done\n\n---\n");

      const result = await getReadyTasks(todoPath, donePath);
      expect(result).toEqual([]);
    });
  });

  describe("missing done file", () => {
    it("treats done set as empty when donePath does not exist", async () => {
      const dir = await makeTmpDir();
      const todoPath = await writeTodoFile(dir, TODO_WITH_DEPS);
      const donePath = path.join(dir, "tasks-done.md"); // does not exist

      const result = await getReadyTasks(todoPath, donePath);
      // Only slice-101 (no needs) is ready
      expect(result.map((t) => t.sliceId)).toEqual(["slice-101"]);
    });

    it("returns all tasks when none have needs and done file is missing", async () => {
      const dir = await makeTmpDir();
      const todoPath = await writeTodoFile(dir, TODO_NO_DEPS);
      const donePath = path.join(dir, "tasks-done.md"); // does not exist

      const result = await getReadyTasks(todoPath, donePath);
      expect(result.map((t) => t.sliceId)).toEqual(["slice-101", "slice-102"]);
    });
  });

  describe("missing todo file", () => {
    it("throws with message containing the path when todoPath does not exist", async () => {
      const dir = await makeTmpDir();
      const todoPath = path.join(dir, "tasks-todo.md"); // does not exist
      const donePath = path.join(dir, "tasks-done.md");

      await expect(getReadyTasks(todoPath, donePath)).rejects.toThrow(
        `tasks-todo.md not found at: ${todoPath}`
      );
    });
  });

  describe("task blocks with non-task content", () => {
    it("skips blocks that have no ## [slice-NNN] heading", async () => {
      const dir = await makeTmpDir();
      const content = `# Tasks — Todo\n\n---\n\n## [slice-300] -- Real task\n**Epic:** E30\n\n---\n\nSome prose block with no slice heading.\n\n---\n`;
      const todoPath = await writeTodoFile(dir, content);
      const donePath = path.join(dir, "tasks-done.md");

      const result = await getReadyTasks(todoPath, donePath);
      expect(result.map((t) => t.sliceId)).toEqual(["slice-300"]);
    });
  });
});
