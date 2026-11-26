export const meta = {
  name: 'meto-swarm',
  description: 'Run the swarm: plan a request if one is given, launch the epic agents that share no files, test finished epics, repeat until every epic is complete or blocked',
  whenToUse: 'In a swarm-mode meto project, to build what is in ai/tasks/tasks-todo.md, or to plan and build a new request. Args: a plain sentence, or { request: "add a logout button" }, is planned by the PM first; { dryRun: true } only prints the plan; { epics: ["E1","E2"] } limits the run; { maxRounds: 3 } caps the rounds (default 6).',
  phases: [
    { title: 'Plan', detail: 'the PM slices a request into the board, when one is given' },
    { title: 'Read', detail: 'meto-cli repair --swarm, then the swarm state from meto-cli status --json' },
    { title: 'Build', detail: 'one epic agent per epic, non-overlapping epics in parallel; then the developer for slices no epic owns' },
    { title: 'Test', detail: 'the tester, one epic at a time' },
  ],
}

// Which epics run together is decided here, in code, from the board and the
// domain map. The agents only read state, build, and test.

const options = args && typeof args === 'object' ? args : {}
// `/meto-swarm add a logout button` arrives as a plain string
const request = typeof args === 'string' ? args.trim() : typeof options.request === 'string' ? options.request.trim() : ''
const dryRun = options.dryRun === true
const only = Array.isArray(options.epics) ? options.epics : null
const maxRounds = Number.isInteger(options.maxRounds) && options.maxRounds > 0 ? options.maxRounds : 6

const STATE_SCHEMA = {
  type: 'object',
  required: ['epics'],
  properties: {
    error: { type: 'string' },
    repair: { type: 'string', description: 'one line: what the repair command changed, "nothing", or "unavailable: <why>"' },
    unowned: {
      type: 'object',
      properties: {
        todo: { type: 'array', items: { type: 'string' } },
        inTesting: { type: 'array', items: { type: 'string' } },
      },
    },
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
  // Repair first: it gives a new epic its agent and table row, and reopens an epic
  // that was complete before new slices arrived. A dry run only checks.
  const repair = dryRun ? 'npx meto-cli repair --swarm --check' : 'npx meto-cli repair --swarm --yes'
  return agent(
    `In the project root, run \`${repair}\` first. Put one line about it in "repair": what it changed, "nothing", ` +
      'or "unavailable: <why>" if the command fails or does not exist (an older meto-cli has no repair). Carry on either way. ' +
      'Then run `npx meto-cli status --json` and return the JSON it prints, unchanged apart from the added "repair" field. ' +
      'If that command fails, return {"error": "<the error text>", "epics": []}. Run only these two commands and edit no file yourself.',
    { label: `read swarm state (round ${round})`, phase: 'Read', model: 'haiku', effort: 'low', schema: STATE_SCHEMA },
  )
}

const summary = { rounds: 0, planned: '', repair: [], built: [], tested: [], held: [], outsideDomain: [], stopped: '' }

// Plan: a request becomes slices on the board before anything is built.
if (request !== '' && !dryRun) {
  const plan = await agent(
    `Plan this request for a swarm-mode project: "${request}". ` +
      'Write it as slices in ai/tasks/tasks-todo.md, in the task format, small enough to build one at a time. ' +
      'Tag each slice with the epic whose domain in ai/swarm/domain-map.md holds the files it will change. ' +
      'If no epic fits, add an epic to ai/backlog/epics.md and its row, with the paths it owns, to the Epic Domains table of ai/swarm/domain-map.md. ' +
      'A slice that must change files of several epics, or shared files such as package.json, gets no Epic line: the developer builds those one at a time. ' +
      'Do not build anything. Reply with the slice ids you wrote and the epic of each.',
    { agentType: 'meto-pm', label: 'plan the request', phase: 'Plan' },
  )
  summary.planned = typeof plan === 'string' ? plan : plan ? JSON.stringify(plan) : 'the PM returned nothing'
}

// The unowned slices the developer was last given: asked again only when the list changes
let lastSerial = ''

for (let round = 1; round <= maxRounds; round++) {
  const state = await readState(round)
  if (!state || state.error) {
    summary.stopped = `could not read the swarm state: ${state ? state.error : 'the reader returned nothing'}`
    break
  }

  if (state.repair && state.repair !== 'nothing') {
    summary.repair.push(`round ${round}: ${state.repair}`)
    log(`Repair: ${state.repair}`)
  }

  const wanted = state.epics.filter(e => !only || only.includes(e.id))
  // Slices no epic agent owns. Left alone when the run is limited to named epics.
  const unowned = only ? { todo: [], inTesting: [] } : { todo: state.unowned?.todo ?? [], inTesting: state.unowned?.inTesting ?? [] }
  const serialKey = unowned.todo.join(',')
  const serial = serialKey !== '' && serialKey !== lastSerial ? unowned.todo : []
  const buildable = wanted.filter(
    e => (e.status === 'not-started' || e.status === 'on-track') && e.todo > 0 && e.waitingOn.length === 0,
  )
  const waiting = wanted
    .filter(e => (e.status === 'not-started' || e.status === 'on-track') && e.waitingOn.length > 0)
    .map(e => ({ id: e.id, reason: `needs ${e.waitingOn.join(', ')}, still in progress or testing` }))
  const { picked, held } = pickNonOverlapping(buildable)
  const testable = wanted.filter(e => e.status === 'testing-ready' || (e.inTesting > 0 && e.todo === 0))
  summary.held = [...held, ...waiting]
  if (serialKey !== '' && serial.length === 0) {
    summary.held.push({ id: unowned.todo.join(', '), reason: 'no epic, and the developer could not move them last round' })
  }

  if (dryRun) {
    return {
      dryRun: true,
      ...(request !== '' ? { request: 'not planned in a dry run: run without dryRun to have the PM slice it' } : {}),
      repair: state.repair ?? '',
      wouldBuildSerially: serial,
      wouldBuild: picked.map(e => ({ id: e.id, model: MODELS.includes(e.model) ? e.model : 'agent default', todo: e.todo })),
      wouldTest: testable.map(e => e.id),
      held: summary.held,
      blocked: wanted.filter(e => e.status === 'blocked').map(e => e.id),
      complete: wanted.filter(e => e.status === 'complete').map(e => e.id),
    }
  }

  if (picked.length === 0 && testable.length === 0 && serial.length === 0 && unowned.inTesting.length === 0) {
    const open = wanted.filter(e => e.status !== 'complete')
    summary.stopped =
      open.length === 0 && unowned.todo.length === 0
        ? 'every epic is complete'
        : 'nothing can run: the remaining epics are blocked, held or waiting'
    break
  }

  summary.rounds = round
  log(
    `Round ${round}: building ${picked.map(e => e.id).join(', ') || 'nothing'}` +
      (serial.length > 0 ? `, then ${serial.join(', ')} with the developer` : '') +
      `; testing ${testable.map(e => e.id).join(', ') || 'nothing'}`,
  )

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

  // Serial lane: slices no epic owns, built by the developer once the epic agents
  // are back, so it never edits a file an epic agent is working in.
  let serialToTest = unowned.inTesting.length > 0
  if (serial.length > 0) {
    lastSerial = serialKey
    const result = await agent(
      `Build these slices from ai/tasks/tasks-todo.md, one at a time, as your instructions describe: ${serial.join(', ')}. ` +
        'They belong to no epic, so no epic agent will take them. Skip a slice whose Needs are not done yet. ' +
        'Report every file you changed, with paths relative to the project root.',
      { agentType: 'meto-developer', label: `build ${serial.join(', ')}`, phase: 'Build', schema: BUILD_SCHEMA },
    )
    if (result) {
      summary.built.push({ id: 'no epic', status: result.status, slices: result.slicesMoved, blocker: result.blocker })
      if (result.slicesMoved.length > 0) lastSerial = ''
      if (result.status === 'testing-ready') serialToTest = true
    }
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

  if (serialToTest) {
    const result = await agent(
      'Validate the slices in ai/tasks/tasks-in-testing.md that carry no Epic line, or an epic that is not in ai/swarm/SWARM_AWARENESS.md, ' +
        'as your instructions describe. Leave the slices of the epics alone.',
      { agentType: 'meto-tester', label: 'test slices with no epic', phase: 'Test', schema: TEST_SCHEMA },
    )
    if (result) summary.tested.push({ id: 'no epic', passed: result.passed, failed: result.failed })
  }

  if (round === maxRounds) summary.stopped = `reached the limit of ${maxRounds} round${maxRounds === 1 ? '' : 's'}`
}

if (summary.outsideDomain.length > 0) {
  log(`Files changed outside an epic's domain: ${summary.outsideDomain.map(o => `${o.id}: ${o.files.join(', ')}`).join('; ')}`)
}

return summary
