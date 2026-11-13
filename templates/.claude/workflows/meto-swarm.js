export const meta = {
  name: 'meto-swarm',
  description: 'Run the swarm: launch the epic agents that share no files, test finished epics, repeat until every epic is complete or blocked',
  whenToUse: 'In a swarm-mode meto project, to build the epics listed in ai/swarm/SWARM_AWARENESS.md. Args: { dryRun: true } only prints the plan; { epics: ["E1","E2"] } limits the run; { maxRounds: 3 } caps the rounds (default 6).',
  phases: [
    { title: 'Read', detail: 'swarm state from meto-cli status --json' },
    { title: 'Build', detail: 'one epic agent per epic, non-overlapping epics in parallel' },
    { title: 'Test', detail: 'the tester, one epic at a time' },
  ],
}

// Which epics run together is decided here, in code, from the board and the
// domain map. The agents only read state, build, and test.

const options = args && typeof args === 'object' ? args : {}
const dryRun = options.dryRun === true
const only = Array.isArray(options.epics) ? options.epics : null
const maxRounds = Number.isInteger(options.maxRounds) && options.maxRounds > 0 ? options.maxRounds : 6

const STATE_SCHEMA = {
  type: 'object',
  required: ['epics'],
  properties: {
    error: { type: 'string' },
    epics: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'status', 'owns', 'todo', 'inTesting', 'waitingOn', 'model'],
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          status: { type: 'string' },
          owns: { type: 'array', items: { type: 'string' } },
          todo: { type: 'integer' },
          inProgress: { type: 'integer' },
          inTesting: { type: 'integer' },
          waitingOn: { type: 'array', items: { type: 'string' } },
          model: { type: 'string' },
        },
      },
    },
  },
}

const BUILD_SCHEMA = {
  type: 'object',
  required: ['status', 'slicesMoved', 'filesChanged', 'blocker'],
  properties: {
    status: { type: 'string', description: 'on-track, blocked, testing-ready or complete' },
    slicesMoved: { type: 'array', items: { type: 'string' } },
    filesChanged: { type: 'array', items: { type: 'string' } },
    blocker: { type: 'string', description: 'none, or what stopped you' },
  },
}

const TEST_SCHEMA = {
  type: 'object',
  required: ['passed', 'failed'],
  properties: {
    passed: { type: 'array', items: { type: 'string' } },
    failed: { type: 'array', items: { type: 'string' } },
  },
}

const MODELS = ['haiku', 'sonnet', 'opus', 'fable']

// --- path overlap, the same rule the meto mod applies to agent launches ---

const norm = p => String(p).replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/+$/, '')
const isGlob = p => /[*?]/.test(p)
const globToRegex = p =>
  new RegExp('^' + p.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*\*\/?/g, '\u0000').replace(/\*/g, '[^/]*').replace(/\?/g, '[^/]').replace(/\u0000/g, '.*') + '(/.*)?$')

function matchesPath(pattern, path) {
  const p = norm(pattern)
  const f = norm(path)
  if (p === '') return true
  if (isGlob(p)) return globToRegex(p).test(f)
  return f === p || f.startsWith(p + '/')
}

const sample = p => norm(p).replace(/\*+/g, 'x')
const pathsOverlap = (a, b) => matchesPath(a, sample(b)) || matchesPath(b, sample(a))
const domainsOverlap = (a, b) => a.some(x => b.some(y => pathsOverlap(x, y)))

// Paths every epic agent may write besides its own domain
const SHARED_WRITES = ['ai/tasks', 'ai/swarm/SWARM_AWARENESS.md', 'ai/handoff', 'ai/rubric', '.claude/agent-memory']

function outsideDomain(epic, files) {
  return files.filter(file => ![...epic.owns, ...SHARED_WRITES].some(root => matchesPath(root, file)))
}

/** Epics that can run together, in table order: each shares no path with one already picked. */
function pickNonOverlapping(epics) {
  const picked = []
  const held = []
  for (const epic of epics) {
    const clash = picked.find(other => domainsOverlap(epic.owns, other.owns))
    if (epic.owns.length === 0) held.push({ id: epic.id, reason: 'no domain in ai/swarm/domain-map.md' })
    else if (clash) held.push({ id: epic.id, reason: `shares files with ${clash.id}` })
    else picked.push(epic)
  }
  return { picked, held }
}

async function readState(round) {
  return agent(
    'Run `npx meto-cli status --json` in the project root and return the JSON it prints, unchanged. ' +
      'If the command fails, return {"error": "<the error text>", "epics": []}. Read and report only: change no file.',
    { label: `read swarm state (round ${round})`, phase: 'Read', model: 'haiku', effort: 'low', schema: STATE_SCHEMA },
  )
}

const summary = { rounds: 0, built: [], tested: [], held: [], outsideDomain: [], stopped: '' }

for (let round = 1; round <= maxRounds; round++) {
  const state = await readState(round)
  if (!state || state.error) {
    summary.stopped = `could not read the swarm state: ${state ? state.error : 'the reader returned nothing'}`
    break
  }

  const wanted = state.epics.filter(e => !only || only.includes(e.id))
  const buildable = wanted.filter(
    e => (e.status === 'not-started' || e.status === 'on-track') && e.todo > 0 && e.waitingOn.length === 0,
  )
  const waiting = wanted
    .filter(e => (e.status === 'not-started' || e.status === 'on-track') && e.waitingOn.length > 0)
    .map(e => ({ id: e.id, reason: `needs ${e.waitingOn.join(', ')}, still in progress or testing` }))
  const { picked, held } = pickNonOverlapping(buildable)
  const testable = wanted.filter(e => e.status === 'testing-ready' || (e.inTesting > 0 && e.todo === 0))
  summary.held = [...held, ...waiting]

  if (dryRun) {
    return {
      dryRun: true,
      wouldBuild: picked.map(e => ({ id: e.id, model: MODELS.includes(e.model) ? e.model : 'agent default', todo: e.todo })),
      wouldTest: testable.map(e => e.id),
      held: summary.held,
      blocked: wanted.filter(e => e.status === 'blocked').map(e => e.id),
      complete: wanted.filter(e => e.status === 'complete').map(e => e.id),
    }
  }

  if (picked.length === 0 && testable.length === 0) {
    const open = wanted.filter(e => e.status !== 'complete')
    summary.stopped = open.length === 0 ? 'every epic is complete' : 'nothing can run: the remaining epics are blocked, held or waiting'
    break
  }

  summary.rounds = round
  log(`Round ${round}: building ${picked.map(e => e.id).join(', ') || 'nothing'}; testing ${testable.map(e => e.id).join(', ') || 'nothing'}`)

  // Build: the tester must see every epic's result, so this is a barrier.
  const builds = await parallel(
    picked.map(epic => () =>
      agent(
        `Work through the ${epic.id} slices in ai/tasks/tasks-todo.md as your instructions describe. ` +
          'This run is driven by the /meto-swarm workflow: when your todo is empty, set your status and return instead of waiting for the tester, ' +
          'and return at once if you are blocked. Report every file you changed, with paths relative to the project root.',
        {
          agentType: `meto-epic-${epic.id}`,
          label: `build ${epic.id}`,
          phase: 'Build',
          schema: BUILD_SCHEMA,
          ...(MODELS.includes(epic.model) ? { model: epic.model } : {}),
        },
      ).then(result => ({ epic, result })),
    ),
  )

  for (const build of builds.filter(Boolean)) {
    if (!build.result) continue
    summary.built.push({ id: build.epic.id, status: build.result.status, slices: build.result.slicesMoved, blocker: build.result.blocker })
    const outside = outsideDomain(build.epic, build.result.filesChanged)
    if (outside.length > 0) summary.outsideDomain.push({ id: build.epic.id, files: outside })
  }

  // Test: one epic at a time, because the tester writes the board.
  const justFinished = builds
    .filter(Boolean)
    .filter(b => b.result && b.result.status === 'testing-ready')
    .map(b => b.epic)
  const toTest = [...testable, ...justFinished.filter(e => !testable.some(t => t.id === e.id))]
  for (const epic of toTest) {
    const result = await agent(
      `Validate the ${epic.id} slices in ai/tasks/tasks-in-testing.md in swarm mode, as your instructions describe, ` +
        'and update the epic status in ai/swarm/SWARM_AWARENESS.md when you are done.',
      { agentType: 'meto-tester', label: `test ${epic.id}`, phase: 'Test', schema: TEST_SCHEMA },
    )
    if (result) summary.tested.push({ id: epic.id, passed: result.passed, failed: result.failed })
  }

  if (round === maxRounds) summary.stopped = `reached the limit of ${maxRounds} round${maxRounds === 1 ? '' : 's'}`
}

if (summary.outsideDomain.length > 0) {
  log(`Files changed outside an epic's domain: ${summary.outsideDomain.map(o => `${o.id}: ${o.files.join(', ')}`).join('; ')}`)
}

return summary
