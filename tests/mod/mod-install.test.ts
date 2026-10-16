import { mkdtemp, readFile, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { installMetoMod } from "../../src/cli/audit/mod-install.js";

const TEMPLATES = join(process.cwd(), "templates");

describe("installMetoMod", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "meto-mod-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("copies the whole mod into .claude/skills/meto", async () => {
    const written = await installMetoMod(dir, TEMPLATES);
    expect(written).toEqual(
      expect.arrayContaining([
        ".claude/skills/meto/.claude-plugin/plugin.json",
        ".claude/skills/meto/hooks/hooks.json",
        ".claude/skills/meto/hooks/register.tsx",
        ".claude/skills/meto/hooks/meto.ts",
        ".claude/skills/meto/types/index.d.ts",
      ]),
    );
    const manifest = JSON.parse(
      await readFile(join(dir, ".claude/skills/meto/.claude-plugin/plugin.json"), "utf-8"),
    );
    expect(manifest.name).toBe("meto");
  });

  it("never overwrites a file the project already has", async () => {
    const hooks = join(dir, ".claude/skills/meto/hooks");
    await mkdir(hooks, { recursive: true });
    await writeFile(join(hooks, "register.tsx"), "// mine", "utf-8");

    const written = await installMetoMod(dir, TEMPLATES);

    expect(written).not.toContain(".claude/skills/meto/hooks/register.tsx");
    expect(await readFile(join(hooks, "register.tsx"), "utf-8")).toBe("// mine");
  });

  it("ships no test files into projects", async () => {
    const written = await installMetoMod(dir, TEMPLATES);
    expect(written.some((path) => /\.test\.tsx?$/.test(path))).toBe(false);
  });
});
