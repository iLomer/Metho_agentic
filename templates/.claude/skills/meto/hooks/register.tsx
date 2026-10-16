// Type imports only: a runtime import of 'claude-code' would fail a project's own import linting.
import type { EngineInterface, Register } from 'claude-code'

import {
  DOMAIN_FILE,
  HANDOFF_FILE,
  SWARM_FILE,
  TASK_FILES,
  blockedByOpenWork,
  columnsFrom,
  formatTokens,
  parseShortstat,
  domainOverlap,
  epicOf,
  highestSlice,
  isLive,
  isMetoAgent,
  mayWrite,
  parseDomains,
  parseEpics,
  parseSlices,
  relativeTo,
  sliceId,
} from './meto'

const PANE = 'meto-board'
const REFRESH_MS = 15_000

const IS_METO = { plugin: 'meto', key: 'isMeto' } as const
const BOARD = { plugin: 'meto', key: 'board' } as const
const EPICS = { plugin: 'meto', key: 'epics' } as const
const STARTED_AT = { plugin: 'meto', key: 'startedAt' } as const
const IS_TOUCHED = { plugin: 'meto', key: 'isTouched' } as const
const IS_HANDOFF_STALE = { plugin: 'meto', key: 'isHandoffStale' } as const
const SESSION = { plugin: 'meto', key: 'session' } as const
const TOKENS_IN = { plugin: 'meto', key: 'tokensIn' } as const
const TOKENS_OUT = { plugin: 'meto', key: 'tokensOut' } as const

function epicColor(status: string): 'error' | 'warning' | 'success' | undefined {
  return status === 'blocked' ? 'error' : status === 'testing-ready' ? 'warning' : status === 'complete' ? 'success' : undefined
}

function columnColor(key: string): 'suggestion' | 'warning' | 'success' | 'subtle' | undefined {
  return key === 'in-progress' ? 'suggestion' : key === 'testing' ? 'warning' : key === 'done' ? 'success' : key === 'backlog' ? 'subtle' : undefined
}

function contextColor(percent: number | undefined): 'success' | 'warning' | 'error' | 'subtle' {
  return percent === undefined ? 'subtle' : percent < 50 ? 'success' : percent < 80 ? 'warning' : 'error'
}

function sizeColor(size: string): 'subtle' | 'suggestion' | 'warning' {
  return size === 'L' ? 'warning' : size === 'M' ? 'suggestion' : 'subtle'
}

async function isMetoProject($: EngineInterface): Promise<boolean> {
  return (await $.state.get(IS_METO)).value === true
}

async function readOr($: EngineInterface, path: string): Promise<string> {
  try {
    return await $.fs.read(path)
  } catch {
    return ''
  }
}

/** Re-reads the board, the swarm table and the handoff's age into state. */
async function git($: EngineInterface, args: string[]): Promise<string> {
  try {
    const ran = await $.process.run(['git', ...args], { timeoutMs: 5_000 })
    return ran.exitCode === 0 ? ran.stdout.trim() : ''
  } catch {
    return ''
  }
}

/** What the status line showed: model, context, branch and changes, tokens, folder, cost. */
async function refreshSession($: EngineInterface): Promise<void> {
  const [model, usage, branch, stat, cwd, user] = await Promise.all([
    $.session.model(),
    $.session.usage(),
    git($, ['rev-parse', '--abbrev-ref', 'HEAD']),
    git($, ['diff', '--shortstat', 'HEAD']),
    $.session.cwd(),
    git($, ['config', 'user.name']),
  ])
  await $.state.set(SESSION, {
    model,
    user,
    percent: usage.context.percent,
    tokens: usage.context.tokens,
    window: usage.context.window,
    usd: usage.cost?.usd,
    branch,
    ...parseShortstat(stat),
    input: (await $.state.get(TOKENS_IN)).value ?? 0,
    output: (await $.state.get(TOKENS_OUT)).value ?? 0,
    folder: cwd.replace(/\\/g, '/').split('/').pop() ?? cwd,
  })
}

async function refresh($: EngineInterface): Promise<void> {
  await refreshSession($)
  const texts: Record<string, string> = {}
  for (const { key, file } of TASK_FILES) texts[key] = await readOr($, file)
  await $.state.set(BOARD, columnsFrom(texts))
  const swarm = await readOr($, SWARM_FILE)
  await $.state.set(EPICS, parseEpics(swarm))

  const since = (await $.state.get(STARTED_AT)).value ?? 0
  let handoffAt = 0
  try {
    handoffAt = (await $.fs.stat(HANDOFF_FILE)).mtimeMs
  } catch {
    handoffAt = 0
  }
  const touched = (await $.state.get(IS_TOUCHED)).value === true
  const stale = touched && handoffAt < since
  await $.state.set(IS_HANDOFF_STALE, stale)
}

/** The live agent that owns this loop, when it is a subagent or teammate. */
async function callerOf($: EngineInterface, agentId: string | undefined) {
  if (agentId === undefined) return undefined
  return (await $.agent.list()).find(agent => agent.id === agentId)
}

/** Overlap guard: refuses an epic agent whose epic, files or open dependencies collide. */
async function overlapReason($: EngineInterface, subagentType: string | undefined): Promise<string | undefined> {
  const epicId = epicOf(subagentType)
  if (epicId === undefined) return undefined

  const running = (await $.agent.list()).filter(a => isLive(a.status) && epicOf(a.type) !== undefined)
  const same = running.find(a => epicOf(a.type) === epicId)
  if (same) return `meto-epic-${epicId} is already running (${same.id}). One agent per epic — wait for it to finish.`

  const domains = parseDomains(await readOr($, DOMAIN_FILE))
  const mine = domains[epicId]?.owns ?? []
  for (const other of running) {
    const otherId = epicOf(other.type) ?? ''
    const clash = domainOverlap(mine, domains[otherId]?.owns ?? [])
    if (clash) {
      return `meto-epic-${epicId} and the running meto-epic-${otherId} both own ${clash[0]} / ${clash[1]} (ai/swarm/domain-map.md). Run them one after the other.`
    }
  }

  const todo = parseSlices(await readOr($, TASK_FILES[1].file))
  const open = [
    ...parseSlices(await readOr($, TASK_FILES[2].file)),
    ...parseSlices(await readOr($, TASK_FILES[3].file)),
  ]
  const blocked = blockedByOpenWork(todo, open, epicId)
  if (blocked) {
    return `${blocked[0].id} (${epicId}) needs ${blocked[1]}, which is still in progress or testing — it is the same feature. Wait for ${blocked[1]} to reach done.`
  }

  return undefined
}

/** Next free slice IDs, checked against the local board, origin's board and this machine's reservations. */
async function reserveSlices($: EngineInterface, count: number, prefix: string): Promise<string> {
  const texts = [] as string[]
  for (const { file } of TASK_FILES) texts.push(await readOr($, file))

  let remote = 'origin'
  try {
    await $.process.run(['git', 'fetch', '--quiet', 'origin'], { timeoutMs: 20_000 })
    const head = await $.process.run(['git', 'rev-parse', '--abbrev-ref', 'origin/HEAD'])
    remote = head.exitCode === 0 ? head.stdout.trim() : 'origin/main'
    for (const { file } of TASK_FILES) {
      const shown = await $.process.run(['git', 'show', `${remote}:${file}`])
      if (shown.exitCode === 0) texts.push(shown.stdout)
    }
  } catch {
    remote = ''
  }

  const cwd = await $.session.cwd()
  const key = `reserved:${cwd}:${prefix}`
  const reserved = Number((await $.store.get(key)) ?? 0)
  const { max, width } = highestSlice(texts, prefix)
  const first = Math.max(max, reserved) + 1
  const ids = Array.from({ length: count }, (_, i) => sliceId(first + i, width, prefix))
  await $.store.set(key, first + count - 1)

  const checked = remote === '' ? 'the local board (origin could not be reached)' : `the local board and ${remote}`
  return `Next free ${count === 1 ? 'ID' : 'IDs'}: ${ids.join(', ')} — checked ${checked}, and reserved on this machine. Commit and push the new task blocks soon so other sessions see them.`
}

export const register: Register = (on, options) => {
  const defaultPrefix = typeof options.idPrefix === 'string' && options.idPrefix !== '' ? options.idPrefix : 'slice'
  const showSwarmBand = options.swarmBand === true

  on('session.start', async ($, e, next) => {
    const result = await next(e)
    if (!(await $.fs.exists(TASK_FILES[1].file))) return result

    await $.state.set(IS_METO, true)
    const now = await $.clock.now()
    await $.state.set(STARTED_AT, now)
    await $.state.set(IS_TOUCHED, false)
    await $.command.register({ name: 'meto-board', description: 'Show the meto board in a pane' })
    await $.command.register({
      name: 'meto-slice',
      description: 'Reserve the next free slice ID(s), checked against origin',
      argumentHint: '[count]',
    })
    await refresh($)
    $.clock.every(REFRESH_MS, () => void refresh($))

    return result
  })

  // Session token totals, as the status line counted them, refreshed after every turn.
  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    if (!(await isMetoProject($))) return result
    const usage = result.usage
    if (usage) {
      const input = usage.input_tokens + usage.cache_read_input_tokens + (usage.cache_creation_input_tokens ?? 0)
      await $.state.set(TOKENS_IN, ((await $.state.get(TOKENS_IN)).value ?? 0) + input)
      await $.state.set(TOKENS_OUT, ((await $.state.get(TOKENS_OUT)).value ?? 0) + usage.output_tokens)
    }
    await refreshSession($)
    return result
  })

  on('command.run', { command: 'meto-board' }, async $ => {
    await refresh($)
    const opened = await $.ui.open({ id: PANE, title: 'meto board' })
    return { text: opened.isPlaced ? 'Board pane opened.' : 'Board pane will open when there is room.' }
  })

  on('command.run', { command: 'meto-slice' }, async ($, e) => {
    const words = e.args.trim().split(/\s+/).filter(word => word !== '')
    const number = words.find(word => /^\d+$/.test(word))
    const prefix = words.find(word => /^[A-Za-z][\w]*$/.test(word)) ?? defaultPrefix
    const count = Math.min(Math.max(Number.parseInt(number ?? '1', 10), 1), 20)
    return { text: await reserveSlices($, count, prefix) }
  })

  // Overlap guard: one agent per epic, no shared files, no split feature.
  on('tool.call', { tool: 'Agent' }, async ($, e, next) => {
    if (!(await isMetoProject($))) return next(e)
    const reason = await overlapReason($, e.subagent_type)
    return reason ? { deny: `meto: ${reason}` } : next(e)
  })

  // One report per agent: a meto subagent's final answer is its report.
  on('tool.call', { tool: 'SendMessage' }, async ($, e, next) => {
    if (!(await isMetoProject($))) return next(e)
    const caller = await callerOf($, e.agentId)
    if (caller && (isMetoAgent(caller.type) || isMetoAgent(caller.name))) {
      return {
        deny: "meto: don't send a separate message — your final answer is your report. Put it there and finish.",
      }
    }
    return next(e)
  })

  // Domain guard: an epic agent writes only inside its domain.
  on('tool.call', { tool: ['Edit', 'Write', 'NotebookEdit'] }, async ($, e, next) => {
    if (!(await isMetoProject($))) return next(e)
    const target = e.tool === 'NotebookEdit' ? e.notebook_path : e.tool === 'Edit' || e.tool === 'Write' ? e.file_path : ''
    const path = relativeTo(target, await $.session.cwd())

    const caller = await callerOf($, e.agentId)
    const epicId = epicOf(caller?.type)
    if (epicId !== undefined) {
      const domain = parseDomains(await readOr($, DOMAIN_FILE))[epicId]
      if (domain !== undefined && !mayWrite(path, [...domain.owns, ...domain.shared], epicId)) {
        return {
          deny: `meto: ${path} is outside meto-epic-${epicId}'s domain in ${DOMAIN_FILE}. Log the conflict in ${SWARM_FILE}, set your status to blocked, and stop.`,
        }
      }
    }

    const ran = await next(e)
    if (ran.deny === undefined && ran.isError !== true) {
      if (path !== HANDOFF_FILE) await $.state.set(IS_TOUCHED, true)
      await refresh($)
    }
    return ran
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const columns = (await $.state.get(BOARD)).value ?? []
    const session = (await $.state.get(SESSION)).value ?? null
    const list = (await $.state.get(EPICS)).value ?? []
    const stale = (await $.state.get(IS_HANDOFF_STALE)).value === true
    const width = Math.max(20, e.props.bodyColumns)
    const room = Math.max(4, (e.viewport?.rows ?? 24) - 10 - (list.length > 0 ? list.length + 2 : 0) - (session ? 5 : 0))
    const cut = (text: string, by = 0) => (text.length > width - 2 - by ? `${text.slice(0, Math.max(1, width - 3 - by))}…` : text)
    const lists = columns.filter(c => c.key === 'in-progress' || c.key === 'testing' || c.key === 'todo')
    let left = room

    // A divider across the pane, with an optional label: ── Swarm ─────────
    const rule = (label?: string) =>
      label === undefined ? (
        <Text color="subtle">{'─'.repeat(width - 1)}</Text>
      ) : (
        <Text>
          <Text color="subtle">{'── '}</Text>
          <Text bold color="claude">
            {label}
          </Text>
          <Text color="subtle">{` ${'─'.repeat(Math.max(2, width - label.length - 5))}`}</Text>
        </Text>
      )

    return (
      <Box flexDirection="column">
        {session && (
          <Box flexDirection="column">
            {rule('Session')}
            <Text>
              <Text bold color="suggestion">
                {session.model}
              </Text>
              <Text color="subtle">{' · ctx '}</Text>
              <Text color={contextColor(session.percent)}>{session.percent === undefined ? '—' : `${session.percent}%`}</Text>
              <Text color="subtle">
                {session.tokens === undefined ? '' : ` (${formatTokens(session.tokens)}/${formatTokens(session.window)})`}
                {session.usd === undefined ? '' : ' · '}
              </Text>
              {session.usd !== undefined && <Text color="success">{`$${session.usd.toFixed(2)}`}</Text>}
            </Text>
            <Text>
              {session.user !== '' && <Text>{`${session.user}`}</Text>}
              {session.user !== '' && <Text color="subtle">{' · '}</Text>}
              <Text color="autoAccept">{session.branch || 'no git'}</Text>
              {session.added > 0 && <Text color="success">{` +${session.added}`}</Text>}
              {session.removed > 0 && <Text color="error">{` -${session.removed}`}</Text>}
              <Text color="subtle">{` · ${session.folder}`}</Text>
            </Text>
            <Text color="subtle">
              {`in ${formatTokens(session.input)} · out ${formatTokens(session.output)} · total ${formatTokens(session.input + session.output)}`}
            </Text>
          </Box>
        )}

        {rule('Board')}
        <Text>
          {columns.map((c, i) => (
            <Text key={c.key}>
              {i > 0 && <Text color="subtle">{' · '}</Text>}
              <Text color="subtle">{`${c.label} `}</Text>
              <Text bold color={columnColor(c.key)}>
                {String(c.count)}
              </Text>
            </Text>
          ))}
        </Text>
        {stale && <Text color="warning">{cut(`⚠ Handoff not written this session — update ${HANDOFF_FILE}`)}</Text>}

        {list.length > 0 && (
          <Box flexDirection="column" marginTop={1}>
            {rule('Swarm')}
            {list.map(epic => (
              <Text key={epic.id}>
                <Text color={epicColor(epic.status) ?? 'subtle'}>{'● '}</Text>
                <Text bold>{`${epic.id} `}</Text>
                <Text color={epicColor(epic.status)}>{epic.status}</Text>
                <Text color="subtle">{cut(epic.blocker ? ` — ${epic.blocker}` : `  ${epic.done} done`, epic.id.length + epic.status.length + 3)}</Text>
              </Text>
            ))}
          </Box>
        )}

        {lists.map(column => {
          const shown = column.slices.slice(0, Math.max(0, Math.min(column.key === 'todo' ? 3 : 8, left)))
          left -= shown.length + 2
          return (
            <Box key={column.key} flexDirection="column" marginTop={1}>
              {rule(column.key === 'todo' ? 'Next up' : column.label)}
              {shown.length === 0 && <Text color="subtle">  nothing here</Text>}
              {shown.map(slice => (
                <Text key={slice.id}>
                  <Text color={columnColor(column.key)}>{slice.id}</Text>
                  {slice.size !== undefined && <Text color={sizeColor(slice.size)}>{` ${slice.size}`}</Text>}
                  <Text>{cut(` ${slice.title}`, slice.id.length + (slice.size?.length ?? 0) + 1)}</Text>
                </Text>
              ))}
            </Box>
          )
        })}
      </Box>
    )
  })

  // The full swarm row above the prompt, only when the `swarmBand` setting is on.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (!showSwarmBand || e.props.hasSurvey || !(await isMetoProject($))) return next(e)
    const list = (await $.state.get(EPICS)).value ?? []
    if (list.length === 0) return next(e)

    const { Text } = $.ui.resolve(e)

    return (
      <Text>
        <Text dimColor>swarm </Text>
        {list.map((epic, i) => (
          <Text key={epic.id} color={epicColor(epic.status)}>
            {i > 0 ? ' · ' : ''}
            {epic.id} {epic.status}
          </Text>
        ))}
      </Text>
    )
  })
}
