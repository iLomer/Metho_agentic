import { describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { resolveTemplatesDir } from "../../src/cli/renderer.js";

/**
 * Runs templates/.claude/workflows/meto-swarm.js the way the Workflow tool
 * does (script body in an async function with agent/parallel/log globals),
 * with the agents replaced by stubs. What is under test is the script's own
 * decisions: which epics run together, on which model, and when it stops.
 */

interface EpicState {
  id: string;
  status: string;
  owns: string[];
  todo: number;
  inTesting: number;
  waitingOn: string[];
  model: string;
}

interface AgentCall {
  prompt: string;
  opts: { agentType?: string; model?: string; label?: string; phase?: string };
}

type AgentStub = (call: AgentCall, calls: AgentCall[]) => unknown;

const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor as new (
  ...args: string[]
) => (...args: unknown[]) => Promise<unknown>;

async function runWorkflow(args: unknown, stub: AgentStub): Promise<{ result: unknown; calls: AgentCall[] }> {
  const source = await readFile(
    join(resolveTemplatesDir(), ".claude", "workflows", "meto-swarm.js"),
    "utf-8",
  );
  const body = source.replace("export const meta", "const meta");
  const calls: AgentCall[] = [];
  const agent = async (prompt: string, opts: AgentCall["opts"] = {}) => {
    const call = { prompt, opts };
    calls.push(call);
    return stub(call, calls);
  };
  const parallel = (thunks: Array<() => Promise<unknown>>) =>
    Promise.all(thunks.map((t) => t().catch(() => null)));
  const run = new AsyncFunction("agent", "parallel", "pipeline", "phase", "log", "args", "budget", body);
  const result = await run(agent, parallel, () => [], () => {}, () => {}, args, { total: null });
  return { result, calls };
}

const epic = (id: string, over: Partial<EpicState> = {}): EpicState => ({
  id,
  status: "on-track",
  owns: [`src/${id.toLowerCase()}/`],
  todo: 2,
  inTesting: 0,
  waitingOn: [],
  model: "none",
  ...over,
});

const isRead = (call: AgentCall) => call.opts.phase === "Read";

describe("meto-swarm workflow", () => {
  it("starts with a literal meta block naming the workflow", async () => {
    const source = await readFile(
      join(resolveTemplatesDir(), ".claude", "workflows", "meto-swarm.js"),
      "utf-8",
    );
    expect(source.startsWith("export const meta = {")).toBe(true);
    expect(source).toContain("name: 'meto-swarm'");
    // Workflow scripts may not use these: they would break resume
    expect(source).not.toMatch(/Date\.now\(|Math\.random\(|new Date\(\)/);
  });

  it("dry run plans without launching an epic agent", async () => {
    const state = {
      epics: [
        epic("E1", { model: "opus" }),
        epic("E2", { owns: ["src/e1/shared.ts"] }),
        epic("E3", { waitingOn: ["slice-004"] }),
        epic("E4", { status: "testing-ready", todo: 0, inTesting: 2 }),
        epic("E5", { status: "complete", todo: 0 }),
        epic("E6", { owns: [] }),
      ],
    };
    const { result, calls } = await runWorkflow({ dryRun: true }, () => state);

    expect(calls).toHaveLength(1);
    expect(isRead(calls[0])).toBe(true);
    // A dry run checks what repair would change, and writes nothing
    expect(calls[0].prompt).toContain("npx meto-cli repair --swarm --check");
    expect(result).toEqual({
      dryRun: true,
      repair: "",
      wouldBuildSerially: [],
      wouldBuild: [{ id: "E1", model: "opus", todo: 2 }],
      wouldTest: ["E4"],
      held: [
        { id: "E2", reason: "shares files with E1" },
        { id: "E6", reason: "no domain in ai/swarm/domain-map.md" },
        { id: "E3", reason: "needs slice-004, still in progress or testing" },
      ],
      blocked: [],
      complete: ["E5"],
    });
  });

  it("builds non-overlapping epics on their model, then tests, then stops when all are complete", async () => {
    const rounds = [
      { epics: [epic("E1", { model: "opus" }), epic("E2", { model: "haiku" }), epic("E3", { owns: ["src/e2/"] })] },
      { epics: [epic("E1", { status: "complete", todo: 0 }), epic("E2", { status: "complete", todo: 0 }), epic("E3", { status: "complete", todo: 0 })] },
    ];
    let reads = 0;
    const { result, calls } = await runWorkflow(undefined, (call) => {
      if (isRead(call)) return rounds[Math.min(reads++, rounds.length - 1)];
      if (call.opts.phase === "Build") {
        return { status: "testing-ready", slicesMoved: ["slice-001"], filesChanged: ["src/e1/a.ts", "ai/tasks/tasks-done.md"], blocker: "none" };
      }
      return { passed: ["slice-001"], failed: [] };
    });

    const builds = calls.filter((c) => c.opts.phase === "Build");
    expect(builds.map((c) => c.opts.agentType)).toEqual(["meto-epic-E1", "meto-epic-E2"]);
    expect(builds.map((c) => c.opts.model)).toEqual(["opus", "haiku"]);

    const tests = calls.filter((c) => c.opts.phase === "Test");
    expect(tests.map((c) => c.opts.agentType)).toEqual(["meto-tester", "meto-tester"]);
    expect(tests.map((c) => c.opts.label)).toEqual(["test E1", "test E2"]);

    const summary = result as { rounds: number; stopped: string; outsideDomain: Array<{ id: string; files: string[] }> };
    expect(summary.rounds).toBe(1);
    expect(summary.stopped).toBe("every epic is complete");
    // E2's agent reported a file under src/e1/, which is not its domain
    expect(summary.outsideDomain).toEqual([{ id: "E2", files: ["src/e1/a.ts"] }]);
  });

  it("leaves the model unset when no slice asks for one", async () => {
    let reads = 0;
    const { calls } = await runWorkflow({ maxRounds: 1 }, (call) => {
      if (isRead(call)) return { epics: [epic("E1")] };
      reads++;
      return { status: "on-track", slicesMoved: [], filesChanged: [], blocker: "none" };
    });
    const build = calls.find((c) => c.opts.phase === "Build");
    expect(build?.opts.agentType).toBe("meto-epic-E1");
    expect(build?.opts).not.toHaveProperty("model");
    expect(reads).toBe(1);
  });

  it("limits the run to the epics asked for and stops at maxRounds", async () => {
    const { result, calls } = await runWorkflow({ epics: ["E2"], maxRounds: 2 }, (call) => {
      if (isRead(call)) return { epics: [epic("E1"), epic("E2")] };
      return { status: "on-track", slicesMoved: [], filesChanged: [], blocker: "none" };
    });
    const builds = calls.filter((c) => c.opts.phase === "Build");
    expect(builds.map((c) => c.opts.agentType)).toEqual(["meto-epic-E2", "meto-epic-E2"]);
    expect((result as { stopped: string }).stopped).toBe("reached the limit of 2 rounds");
  });

  it("stops when the state can't be read or nothing can run", async () => {
    const failed = await runWorkflow(undefined, () => ({ error: "not a swarm-mode meto project", epics: [] }));
    expect((failed.result as { stopped: string }).stopped).toContain("not a swarm-mode meto project");
    expect(failed.calls).toHaveLength(1);

    const stuck = await runWorkflow(undefined, () => ({ epics: [epic("E1", { status: "blocked" })] }));
    expect((stuck.result as { stopped: string }).stopped).toContain("nothing can run");
    expect(stuck.calls).toHaveLength(1);
  });

  const built = { status: "on-track", slicesMoved: ["slice-001"], filesChanged: [], blocker: "none" };

  it("repairs the swarm files before it reads the state, every round", async () => {
    const { calls } = await runWorkflow({ maxRounds: 2 }, (call) => (isRead(call) ? { epics: [epic("E1")] } : built));
    const reads = calls.filter(isRead);

    expect(reads).toHaveLength(2);
    for (const read of reads) {
      expect(read.prompt).toContain("npx meto-cli repair --swarm --yes");
      expect(read.prompt.indexOf("repair --swarm")).toBeLessThan(read.prompt.indexOf("status --json"));
    }
  });

  it("carries on when repair is unavailable, and says so", async () => {
    const { result, calls } = await runWorkflow({ maxRounds: 1 }, (call) =>
      isRead(call) ? { repair: "unavailable: unknown command", epics: [epic("E1")] } : built,
    );

    expect(calls.filter((c) => c.opts.phase === "Build").map((c) => c.opts.agentType)).toEqual(["meto-epic-E1"]);
    expect((result as { repair: string[] }).repair).toEqual(["round 1: unavailable: unknown command"]);
  });

  it("has the PM plan a request before the first round", async () => {
    for (const args of [{ request: "add a logout button", maxRounds: 1 }, "add a logout button"]) {
      let reads = 0;
      const { result, calls } = await runWorkflow(args, (call) => {
        if (call.opts.phase === "Plan") return "slice-020 (E1)";
        if (isRead(call)) return reads++ === 0 ? { epics: [epic("E1")] } : { epics: [epic("E1", { status: "complete", todo: 0 })] };
        return built;
      });

      expect(calls[0].opts).toMatchObject({ agentType: "meto-pm", phase: "Plan" });
      expect(calls[0].prompt).toContain("add a logout button");
      expect(isRead(calls[1])).toBe(true);
      expect((result as { planned: string }).planned).toBe("slice-020 (E1)");
    }
  });

  it("does not plan a request in a dry run", async () => {
    const { result, calls } = await runWorkflow({ request: "add a logout button", dryRun: true }, () => ({ epics: [] }));

    expect(calls.some((c) => c.opts.phase === "Plan")).toBe(false);
    expect((result as { request: string }).request).toContain("not planned in a dry run");
  });

  it("gives slices no epic owns to the developer after the epic agents, then tests them", async () => {
    let reads = 0;
    const { result, calls } = await runWorkflow(undefined, (call) => {
      if (isRead(call)) {
        return reads++ === 0
          ? { epics: [epic("E1")], unowned: { todo: ["slice-030", "slice-031"], inTesting: [] } }
          : { epics: [epic("E1", { status: "complete", todo: 0 })], unowned: { todo: [], inTesting: [] } };
      }
      if (call.opts.agentType === "meto-developer") return { ...built, status: "testing-ready", slicesMoved: ["slice-030", "slice-031"] };
      if (call.opts.phase === "Build") return built;
      return { passed: ["slice-030"], failed: [] };
    });

    const order = calls.filter((c) => !isRead(c)).map((c) => c.opts.agentType);
    expect(order).toEqual(["meto-epic-E1", "meto-developer", "meto-tester"]);
    expect(calls.find((c) => c.opts.agentType === "meto-developer")?.prompt).toContain("slice-030, slice-031");
    expect(calls.find((c) => c.opts.agentType === "meto-tester")?.prompt).toContain("no Epic line");
    expect((result as { stopped: string }).stopped).toBe("every epic is complete");
  });

  it("runs the developer when every epic is complete but unowned slices remain", async () => {
    let reads = 0;
    const done = [epic("E1", { status: "complete", todo: 0 })];
    const { calls } = await runWorkflow(undefined, (call) => {
      if (isRead(call)) return { epics: done, unowned: { todo: reads++ === 0 ? ["slice-040"] : [], inTesting: [] } };
      return built;
    });

    expect(calls.filter((c) => !isRead(c)).map((c) => c.opts.agentType)).toEqual(["meto-developer"]);
  });

  it("does not hand the developer the same unmovable slices twice", async () => {
    const { result, calls } = await runWorkflow({ maxRounds: 4 }, (call) => {
      if (isRead(call)) return { epics: [], unowned: { todo: ["slice-050"], inTesting: [] } };
      return { status: "blocked", slicesMoved: [], filesChanged: [], blocker: "needs slice-049" };
    });

    expect(calls.filter((c) => c.opts.agentType === "meto-developer")).toHaveLength(1);
    expect((result as { stopped: string }).stopped).toContain("nothing can run");
  });

  it("leaves unowned slices alone when the run is limited to named epics", async () => {
    const { calls } = await runWorkflow({ epics: ["E1"], maxRounds: 1 }, (call) =>
      isRead(call) ? { epics: [epic("E1")], unowned: { todo: ["slice-060"], inTesting: [] } } : built,
    );

    expect(calls.some((c) => c.opts.agentType === "meto-developer")).toBe(false);
  });
});
