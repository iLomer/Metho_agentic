// Pure parsing and matching for the meto mod: no `$`, so tests cover it directly.

import type { BoardColumn, Epic, Session, Slice } from '../types'

export const TASK_FILES = [
  { key: 'backlog', label: 'Backlog', file: 'ai/tasks/tasks-backlog.md' },
  { key: 'todo', label: 'Todo', file: 'ai/tasks/tasks-todo.md' },
  { key: 'in-progress', label: 'In progress', file: 'ai/tasks/tasks-in-progress.md' },
  { key: 'testing', label: 'Testing', file: 'ai/tasks/tasks-in-testing.md' },
  { key: 'done', label: 'Done', file: 'ai/tasks/tasks-done.md' },
] as const

export const SWARM_FILE = 'ai/swarm/SWARM_AWARENESS.md'
export const DOMAIN_FILE = 'ai/swarm/domain-map.md'
export const HANDOFF_FILE = 'ai/handoff/current.md'

/** Paths every epic agent may write besides its own domain. */
const BOARD_PATHS = ['ai/tasks/', 'ai/swarm/SWARM_AWARENESS.md', 'ai/handoff/', 'ai/rubric/']

const LIVE = new Set(['pending', 'running', 'waiting', 'idle'])

export function isLive(status: string): boolean {
  return LIVE.has(status)
}

/** `meto-epic-E1` → `E1`; anything else → undefined. */
export function epicOf(agentType: string | undefined): string | undefined {
  const match = agentType?.match(/(?:^|:)meto-epic-(.+)$/)
  return match?.[1]
}

/** Any meto agent: `meto-pm`, `meto-developer`, `meto-epic-E1`, ... */
export function isMetoAgent(name: string | undefined): boolean {
  return /(?:^|:)meto-/.test(name ?? '')
}

/** A slice reference: `slice-012`, `slice-152a`, or a per-author `Lom_Slice-0016`. */
const SLICE_REF = /\b(?:[A-Za-z]+_)?[Ss]lice-\d+[a-z]?\b/g

/** Reads `## [slice-NNN] -- Title` blocks (any bracketed id) with their Epic, Size and Needs lines. */
export function parseSlices(md: string): Slice[] {
  const slices: Slice[] = []
  let current: Slice | undefined

  for (const line of md.split(/\r?\n/)) {
    const head = line.match(/^##\s+\[([^\]]+)\]\s*(?:[-—–]+\s*)?(.*)$/)
    if (head) {
      const next: Slice = { id: head[1] ?? '', title: (head[2] ?? '').trim(), needs: [] }
      current = next
      slices.push(next)
      continue
    }
    if (!current) continue

    const epic = line.match(/\*\*Epic:\*\*\s*([A-Za-z0-9_-]+)/)
    if (epic?.[1]) current.epic = epic[1]
    const size = line.match(/\*\*Size:\*\*\s*(XS|S|M|L)\b/)
    if (size?.[1]) current.size = size[1]
    const needs = line.match(/\*\*Needs:\*\*\s*(.*)$/)
    if (needs?.[1] !== undefined) current.needs = needs[1].match(SLICE_REF) ?? []
  }

  return slices
}

/** Splits markdown table rows into trimmed cells, skipping the header divider. */
function tableRows(section: string): string[][] {
  return section
    .split(/\r?\n/)
    .filter(line => line.trim().startsWith('|') && !/^\|\s*-/.test(line.trim()))
    .map(line => line.trim().replace(/^\||\|$/g, '').split('|').map(cell => cell.trim()))
}

/** The text under `heading` up to the next `## ` heading. */
function section(md: string, heading: string): string {
  const start = md.indexOf(heading)
  if (start === -1) return ''
  const rest = md.slice(start + heading.length)
  const end = rest.search(/\n## /)
  return end === -1 ? rest : rest.slice(0, end)
}

const isPlaceholder = (cell: string) => cell === '' || cell.startsWith('*(') || /^Epic ID$/i.test(cell)

/** The `[swarm:epics]` table of SWARM_AWARENESS.md. */
export function parseEpics(md: string): Epic[] {
  return tableRows(section(md, '## [swarm:epics]'))
    .filter(cells => cells.length >= 6 && !isPlaceholder(cells[0] ?? ''))
    .map(([id = '', name = '', , status = '', done = '', blocker = '']) => ({
      id,
      name,
      status,
      done: Number.parseInt(done, 10) || 0,
      blocker: /^none\b/i.test(blocker) ? '' : blocker,
    }))
}

/** Paths in a table cell: the backticked ones, else the comma-separated list; `none` is empty. */
function cellPaths(cell: string): string[] {
  if (isPlaceholder(cell) || /^none\b/i.test(cell)) return []
  const ticked = cell.match(/`([^`]+)`/g)?.map(p => p.slice(1, -1))
  return (ticked ?? cell.split(',')).map(normalize).filter(p => p !== '')
}

export type Domain = { owns: string[]; shared: string[] }

/** The `Epic Domains` table of domain-map.md: epic id → owned and shared paths. */
export function parseDomains(md: string): Record<string, Domain> {
  const domains: Record<string, Domain> = {}
  for (const [id = '', , owns = '', shared = ''] of tableRows(section(md, '## Epic Domains'))) {
    if (isPlaceholder(id)) continue
    const domain = { owns: cellPaths(owns), shared: cellPaths(shared) }
    if (domain.owns.length > 0) domains[id] = domain
  }
  return domains
}

/** Forward slashes, no leading `./`, no trailing glob or slash. */
export function normalize(path: string): string {
  return path
    .trim()
    .replace(/\\/g, '/')
    .replace(/^\.\//, '')
    .replace(/\/\*\*?(\/\*+(\.\w+)?)?$/, '')
    .replace(/\/+$/, '')
}

/** `file` relative to `cwd` when under it, compared case-insensitively on drive paths. */
export function relativeTo(file: string, cwd: string): string {
  const path = normalize(file)
  const root = normalize(cwd)
  const isDrive = /^[A-Za-z]:\//.test(root)
  const under = isDrive ? path.toLowerCase().startsWith(`${root.toLowerCase()}/`) : path.startsWith(`${root}/`)
  return under ? path.slice(root.length + 1) : path
}

const hasGlob = (path: string) => path.includes('*')

const escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** A path pattern as a regex: `**` any depth, `*` within one segment. */
function globRegex(pattern: string): RegExp {
  const body = pattern
    .split(/(\*\*|\*)/)
    .map(part => (part === '**' ? '.*' : part === '*' ? '[^/]*' : escapeRegex(part)))
    .join('')
  return new RegExp(`^${body}(/.*)?$`)
}

/** Whether `path` is `pattern`, lies under it, or matches its glob. */
export function matchesPath(pattern: string, path: string): boolean {
  const p = normalize(pattern)
  const f = normalize(path)
  if (p === '') return true
  if (hasGlob(p)) return globRegex(p).test(f)
  return f === p || f.startsWith(`${p}/`)
}

/** True when two owned paths can name the same file. Globs compare by a sample of each. */
export function pathsOverlap(a: string, b: string): boolean {
  const sample = (path: string) => normalize(path).replace(/\*+/g, 'x')
  return matchesPath(a, sample(b)) || matchesPath(b, sample(a))
}

/** The first pair of overlapping paths between two domains, if any. */
export function domainOverlap(a: string[], b: string[]): [string, string] | undefined {
  for (const x of a) {
    for (const y of b) {
      if (pathsOverlap(x, y)) return [x, y]
    }
  }
  return undefined
}

/** Whether an epic agent may write `file` (relative to the project root). */
export function mayWrite(file: string, owns: string[], epicId: string): boolean {
  const path = normalize(file)
  const own = [...owns, ...BOARD_PATHS, `.claude/agent-memory/meto-epic-${epicId}/`]
  return own.some(root => matchesPath(root, path))
}

/** Todo slices of `epicId` that need a slice still in progress or testing. */
export function blockedByOpenWork(todo: Slice[], open: Slice[], epicId: string): [Slice, string] | undefined {
  const openIds = new Set(open.map(s => s.id))
  for (const slice of todo.filter(s => s.epic === epicId)) {
    const need = slice.needs.find(id => openIds.has(id))
    if (need) return [slice, need]
  }
  return undefined
}

/** The highest number under `prefix` (`slice`, `Lom_Slice`) named in `texts`, and its digit width. */
export function highestSlice(texts: string[], prefix = 'slice'): { max: number; width: number } {
  const pattern = new RegExp(`(?<![A-Za-z_])${escapeRegex(prefix)}-(\\d+)`, 'g')
  let max = 0
  let width = prefix === 'slice' ? 3 : 4
  for (const text of texts) {
    for (const match of text.matchAll(pattern)) {
      const digits = match[1] ?? '0'
      max = Math.max(max, Number.parseInt(digits, 10))
      width = Math.max(width, digits.length)
    }
  }
  return { max, width }
}

export function sliceId(n: number, width: number, prefix = 'slice'): string {
  return `${prefix}-${String(n).padStart(width, '0')}`
}

/** Insertions and deletions from `git diff --shortstat`. */
export function parseShortstat(text: string): { added: number; removed: number } {
  const added = Number(text.match(/(\d+) insertion/)?.[1] ?? 0)
  const removed = Number(text.match(/(\d+) deletion/)?.[1] ?? 0)
  return { added, removed }
}

export function columnsFrom(texts: Record<string, string>): BoardColumn[] {
  return TASK_FILES.map(({ key, label }) => {
    const slices = parseSlices(texts[key] ?? '')
    return { key, label, count: slices.length, slices: key === 'done' || key === 'backlog' ? [] : slices.slice(0, 8) }
  })
}

export type BoardView = {
  session: string
  counts: string
  rows: { key: string; text: string }[]
  alerts: string[]
}

/** The minimal board as lines: session, counts, what is moving (up to `room` rows), what needs the person. */
export function boardView(columns: BoardColumn[], session: Session | null, epics: Epic[], isHandoffStale: boolean, room: number): BoardView {
  const column = (key: string) => columns.find(c => c.key === key)
  const changes = session && session.added + session.removed > 0 ? ` +${session.added} -${session.removed}` : ''
  const sessionLine = session
    ? [session.model, session.percent === undefined ? '' : `ctx ${session.percent}%`, session.branch === '' ? '' : `${session.branch}${changes}`]
        .filter(part => part !== '')
        .join(' · ')
    : ''
  const counts = `todo ${column('todo')?.count ?? 0} · doing ${column('in-progress')?.count ?? 0} · testing ${column('testing')?.count ?? 0} · done ${column('done')?.count ?? 0}`

  const groups = [
    { label: 'now', slices: column('in-progress')?.slices ?? [] },
    { label: 'test', slices: column('testing')?.slices ?? [] },
    { label: 'next', slices: (column('todo')?.slices ?? []).slice(0, 3) },
  ]
  const rows = groups
    .flatMap(group =>
      group.slices.map((slice, i) => ({ key: `${group.label}:${slice.id}`, text: `${(i === 0 ? group.label : '').padEnd(6)}${slice.id}  ${slice.title}` })),
    )
    .slice(0, Math.max(0, room))

  const alerts = [
    ...epics.filter(epic => epic.status === 'blocked').map(epic => `${epic.id} blocked${epic.blocker ? `: ${epic.blocker}` : ''}`),
    ...epics.filter(epic => epic.status === 'testing-ready').map(epic => `${epic.id} ready to test`),
    ...(isHandoffStale ? ['handoff due'] : []),
  ]

  return { session: sessionLine, counts, rows, alerts }
}
