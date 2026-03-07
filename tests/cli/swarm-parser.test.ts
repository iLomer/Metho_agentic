import { describe, it, expect } from "vitest";
import { parseSwarmAwareness } from "../../src/cli/swarm-parser.js";

const WELL_FORMED = `# SWARM_AWARENESS -- TestProject

> READ ONLY for epic agents.

---

## [swarm:meta]
- **Project:** TestProject
- **Mode:** swarm
- **Started:** 2026-03-01
- **Total epics:** 3
- **Total tasks:** 12
- **Acceptance criteria:** 5 / 12 passed

---

## [swarm:epics]

| Epic ID | Name | Agent | Status | Tasks Done | Blocker |
|---|---|---|---|---|---|
| E1 | Auth system | @meto-epic-E1 | complete | 4 | none |
| E2 | Dashboard | @meto-epic-E2 | on-track | 2 | none |
| E3 | API layer | @meto-epic-E3 | blocked | 1 | waiting on E1 auth tokens |

Status values: \`not-started\` / \`on-track\` / \`blocked\` / \`complete\`

---

## [swarm:domains]

See full ownership rules in \`ai/swarm/domain-map.md\`.

| Epic ID | Owns |
|---|---|
| E1 | src/auth/ |

---

## [swarm:checkpoints]

Append only. Never delete entries.

\`\`\`
2026-03-02 | E1 | done:2 | status:on-track | blocker:none
2026-03-03 | E1 | done:4 | status:on-track | blocker:none
2026-03-03 | E3 | done:1 | status:blocked | blocker:waiting on E1 auth tokens
\`\`\`

---

## [swarm:conflicts]

\`\`\`
2026-03-02 | CONFLICT | file:src/shared/types.ts | agents:E1 vs E2 | resolution:resolved
2026-03-03 | CONFLICT | file:src/api/routes.ts | agents:E2 vs E3 | resolution:pending
\`\`\`

---

## [swarm:log]

Free text.
`;

describe("parseSwarmAwareness", () => {
  it("parses a well-formed SWARM_AWARENESS.md", () => {
    const state = parseSwarmAwareness(WELL_FORMED);

    expect(state.meta.projectName).toBe("TestProject");
    expect(state.meta.mode).toBe("swarm");
    expect(state.meta.started).toBe("2026-03-01");
    expect(state.meta.totalEpics).toBe(3);
    expect(state.meta.totalTasks).toBe(12);
    expect(state.meta.acPassed).toBe(5);
    expect(state.meta.acTotal).toBe(12);
  });

  it("parses epic rows correctly", () => {
    const state = parseSwarmAwareness(WELL_FORMED);

    expect(state.epics).toHaveLength(3);

    expect(state.epics[0]).toEqual({
      id: "E1",
      name: "Auth system",
      agent: "@meto-epic-E1",
      status: "complete",
      tasksDone: 4,
      blocker: "none",
    });

    expect(state.epics[1]).toEqual({
      id: "E2",
      name: "Dashboard",
      agent: "@meto-epic-E2",
      status: "on-track",
      tasksDone: 2,
      blocker: "none",
    });

    expect(state.epics[2]).toEqual({
      id: "E3",
      name: "API layer",
      agent: "@meto-epic-E3",
      status: "blocked",
      tasksDone: 1,
      blocker: "waiting on E1 auth tokens",
    });
  });

  it("parses checkpoint entries", () => {
    const state = parseSwarmAwareness(WELL_FORMED);

    expect(state.checkpoints).toHaveLength(3);
    expect(state.checkpoints[0]).toEqual({
      date: "2026-03-02",
      epicId: "E1",
      done: 2,
      status: "on-track",
      blocker: "none",
    });
    expect(state.checkpoints[2]).toEqual({
      date: "2026-03-03",
      epicId: "E3",
      done: 1,
      status: "blocked",
      blocker: "waiting on E1 auth tokens",
    });
  });

  it("parses conflict entries", () => {
    const state = parseSwarmAwareness(WELL_FORMED);

    expect(state.conflicts).toHaveLength(2);
    expect(state.conflicts[0]).toEqual({
      date: "2026-03-02",
      file: "src/shared/types.ts",
      agents: "E1 vs E2",
      resolution: "resolved",
    });
    expect(state.conflicts[1]).toEqual({
      date: "2026-03-03",
      file: "src/api/routes.ts",
      agents: "E2 vs E3",
      resolution: "pending",
    });
  });

  it("returns sensible defaults for a file with no section markers", () => {
    const state = parseSwarmAwareness("# Some unrelated content\n\nNo sections here.");

    expect(state.meta.projectName).toBe("");
    expect(state.meta.mode).toBe("");
    expect(state.meta.started).toBe("");
    expect(state.meta.totalEpics).toBe(0);
    expect(state.meta.totalTasks).toBe(0);
    expect(state.meta.acPassed).toBe(0);
    expect(state.meta.acTotal).toBe(0);
    expect(state.epics).toEqual([]);
    expect(state.checkpoints).toEqual([]);
    expect(state.conflicts).toEqual([]);
  });

  it("handles a partially populated file (meta + epics only)", () => {
    const partial = `## [swarm:meta]
- **Project:** PartialProject
- **Mode:** swarm
- **Started:** 2026-03-05
- **Total epics:** 2
- **Total tasks:** 6
- **Acceptance criteria:** 0 / 6 passed

## [swarm:epics]

| Epic ID | Name | Agent | Status | Tasks Done | Blocker |
|---|---|---|---|---|---|
| E1 | Setup | @meto-epic-E1 | not-started | 0 | none |
| E2 | Core | @meto-epic-E2 | not-started | 0 | none |
`;

    const state = parseSwarmAwareness(partial);

    expect(state.meta.projectName).toBe("PartialProject");
    expect(state.meta.totalEpics).toBe(2);
    expect(state.meta.acPassed).toBe(0);
    expect(state.meta.acTotal).toBe(6);

    expect(state.epics).toHaveLength(2);
    expect(state.epics[0].status).toBe("not-started");
    expect(state.epics[1].status).toBe("not-started");

    expect(state.checkpoints).toEqual([]);
    expect(state.conflicts).toEqual([]);
  });

  it("handles an epic table with an unknown status value", () => {
    const content = `## [swarm:meta]
- **Project:** Test
- **Mode:** swarm

## [swarm:epics]

| Epic ID | Name | Agent | Status | Tasks Done | Blocker |
|---|---|---|---|---|---|
| E1 | Test | @agent | invalid-status | 0 | none |
`;

    const state = parseSwarmAwareness(content);
    expect(state.epics).toHaveLength(1);
    expect(state.epics[0].status).toBe("not-started");
  });

  it("handles empty string input", () => {
    const state = parseSwarmAwareness("");

    expect(state.meta.projectName).toBe("");
    expect(state.epics).toEqual([]);
    expect(state.checkpoints).toEqual([]);
    expect(state.conflicts).toEqual([]);
  });
});
