// Pure parsing and matching for the meto mod: no `$`, so tests cover it directly.

import type { BoardColumn, Epic, Slice } from '../types'

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

/** Reads `## [slice-NNN] -- Title` blocks with their Epic, Size and Needs lines. */
export function parseSlices(md: string): Slice[] {
  const slices: Slice[] = []
  let current: Slice | undefined

  for (const line of md.split(/\r?\n/)) {
    const head = line.match(/^##\s+\[(slice-\d+)\]\s*(?:[-—–]+\s*)?(.*)$/)
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
    if (needs?.[1] !== undefined) current.needs = needs[1].match(/slice-\d+/g) ?? []
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
      blocker: blocker === 'none' ? '' : blocker,
    }))
}

/** The `Epic Domains` table of domain-map.md: epic id → owned paths. */
export function parseDomains(md: string): Record<string, string[]> {
  const domains: Record<string, string[]> = {}
  for (const [id = '', , owns = ''] of tableRows(section(md, '## Epic Domains'))) {
    if (isPlaceholder(id) || isPlaceholder(owns)) continue
    const ticked = owns.match(/`([^`]+)`/g)?.map(p => p.slice(1, -1))
    const paths = ticked ?? owns.split(',')
    domains[id] = paths.map(normalize).filter(p => p !== '')
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

/** True when one path is the other or contains it, at a segment boundary. */
export function pathsOverlap(a: string, b: string): boolean {
  const x = normalize(a)
  const y = normalize(b)
  return x === y || x.startsWith(`${y}/`) || y.startsWith(`${x}/`) || x === '' || y === ''
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
  return own.some(root => {
    const r = normalize(root)
    return path === r || path.startsWith(`${r}/`)
  })
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

/** The highest slice number named anywhere in `texts`, and the digit width in use. */
export function highestSlice(texts: string[]): { max: number; width: number } {
  let max = 0
  let width = 3
  for (const text of texts) {
    for (const match of text.matchAll(/slice-(\d+)/g)) {
      const digits = match[1] ?? '0'
      max = Math.max(max, Number.parseInt(digits, 10))
      width = Math.max(width, digits.length)
    }
  }
  return { max, width }
}

export function sliceId(n: number, width: number): string {
  return `slice-${String(n).padStart(width, '0')}`
}

export function columnsFrom(texts: Record<string, string>): BoardColumn[] {
  return TASK_FILES.map(({ key, label }) => {
    const slices = parseSlices(texts[key] ?? '')
    return { key, label, count: slices.length, slices: key === 'done' || key === 'backlog' ? [] : slices.slice(0, 8) }
  })
}
