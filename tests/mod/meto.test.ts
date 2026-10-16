import { expect, test } from 'vitest'

import {
  blockedByOpenWork,
  boardView,
  domainOverlap,
  epicOf,
  parseShortstat,
  highestSlice,
  isMetoAgent,
  mayWrite,
  parseDomains,
  parseEpics,
  parseSlices,
  relativeTo,
  sliceId,
} from '../../templates/.claude/skills/meto/hooks/meto'

const TODO = `# Todo

## [slice-012] -- Share profile link
**Epic:** E2 | **Size:** M | **Depends on:** none
**Needs:** slice-010, slice-011

## [slice-013] — Receiver view
**Epic:** E3 | **Size:** S | **Depends on:** none
`

const SWARM = `## [swarm:epics]

| Epic ID | Name | Agent | Status | Tasks Done | Blocker |
|---|---|---|---|---|---|
| E1 | Profile | @meto-epic-E1 | on-track | 3 | none |
| E2 | Share | @meto-epic-E2 | blocked | 1 | needs src/lib/url.ts |

---

## [swarm:domains]
`

const DOMAINS = `## Epic Domains

| Epic ID | Epic Name | Owns | Shared With |
|---|---|---|---|
| E1 | Profile | \`src/profile/\`, \`src/lib/\` | none |
| E2 | Share | \`src/share/**\` | none |
| E3 | Receiver | src/lib/receiver, src/receiver | none |
| E4 | *(name)* | *(paths)* | none |

## Shared Files
`

test('parses slice blocks with epic, size and needs', () => {
  const slices = parseSlices(TODO)
  expect(slices.map(s => s.id)).toEqual(['slice-012', 'slice-013'])
  expect(slices[0]).toEqual({ id: 'slice-012', title: 'Share profile link', epic: 'E2', size: 'M', needs: ['slice-010', 'slice-011'] })
  expect(slices[1]?.title).toBe('Receiver view')
})

test('parses the swarm epics table', () => {
  expect(parseEpics(SWARM)).toEqual([
    { id: 'E1', name: 'Profile', status: 'on-track', done: 3, blocker: '' },
    { id: 'E2', name: 'Share', status: 'blocked', done: 1, blocker: 'needs src/lib/url.ts' },
  ])
  expect(parseEpics('## [swarm:epics]\n| Epic ID | Name | Agent | Status | Tasks Done | Blocker |\n| *(populated)* | | | not-started | 0 | none |')).toEqual([])
})

test('parses domains and skips placeholders', () => {
  expect(parseDomains(DOMAINS)).toEqual({
    E1: { owns: ['src/profile', 'src/lib'], shared: [] },
    E2: { owns: ['src/share'], shared: [] },
    E3: { owns: ['src/lib/receiver', 'src/receiver'], shared: [] },
  })
})

test('finds overlapping domains at segment boundaries', () => {
  const d = parseDomains(DOMAINS)
  expect(domainOverlap(d.E1?.owns ?? [], d.E3?.owns ?? [])).toEqual(['src/lib', 'src/lib/receiver'])
  expect(domainOverlap(d.E1?.owns ?? [], d.E2?.owns ?? [])).toBeUndefined()
  expect(domainOverlap(['src/share'], ['src/shared'])).toBeUndefined()
})

// Rows as a real swarm project (Hellow) writes them: file globs, notes, shared files.
const REAL_DOMAINS = `## Epic Domains

| Epic ID | Epic Name | Owns | Shared With |
|---|---|---|---|
| E1 | Foundation | \`.github/\` (incl. the DB test workflow, slice-049), \`supabase/tests/e1_*.sql\`, \`src/app/_layout.tsx\` | \`package.json\` (all) |
| E2 | Auth | \`src/app/(auth)/\`, \`supabase/migrations/*_e2_*.sql\`, \`supabase/functions/account-*/\` | \`src/types/database.ts\`, \`src/app/_layout.tsx\` (auth gate) |
| E3 | Share | \`supabase/migrations/*_e3_*.sql\`, \`src/app/share/\` | none |
`

test('matches file globs in a real domain map', () => {
  const d = parseDomains(REAL_DOMAINS)
  expect(d.E1?.shared).toEqual(['package.json'])
  expect(d.E3?.shared).toEqual([])
  const e2 = [...(d.E2?.owns ?? []), ...(d.E2?.shared ?? [])]
  expect(mayWrite('supabase/migrations/20261001_e2_profiles.sql', e2, 'E2')).toBe(true)
  expect(mayWrite('supabase/functions/account-export/index.ts', e2, 'E2')).toBe(true)
  expect(mayWrite('src/types/database.ts', e2, 'E2')).toBe(true)
  expect(mayWrite('supabase/migrations/20261001_e3_cards.sql', e2, 'E2')).toBe(false)
  expect(domainOverlap(d.E2?.owns ?? [], d.E3?.owns ?? [])).toBeUndefined()
  expect(domainOverlap(d.E1?.owns ?? [], d.E2?.owns ?? [])).toBeUndefined()
})

test('reads per-author ids, suffixes and none-with-a-note blockers', () => {
  const slices = parseSlices(`## [Lom_Slice-0016] -- Export consents
**Epic:** E4 | **Size:** M
**Needs:** slice-152a, Lom_Slice-0012

## [slice-019 follow-up 1] -- Retry`)
  expect(slices.map(s => s.id)).toEqual(['Lom_Slice-0016', 'slice-019 follow-up 1'])
  expect(slices[0]?.needs).toEqual(['slice-152a', 'Lom_Slice-0012'])
  const epics = parseEpics(`## [swarm:epics]
| Epic ID | Name | Agent | Status | Tasks Done | Blocker |
|---|---|---|---|---|---|
| E2 | Auth | meto-epic-E2 | on-track | 22 | none (slice-152 PASS) |`)
  expect(epics[0]?.blocker).toBe('')
})

test('numbers ids per prefix', () => {
  const board = ['## [slice-172]', '## [Lom_Slice-0042]', 'Needs: Lom_Slice-0016']
  expect(highestSlice(board, 'Lom_Slice')).toEqual({ max: 42, width: 4 })
  expect(highestSlice(board).max).toBe(172)
  expect(sliceId(43, 4, 'Lom_Slice')).toBe('Lom_Slice-0043')
})

test('lets an epic agent write its domain and the board only', () => {
  const owns = ['src/share']
  expect(mayWrite('src/share/link.ts', owns, 'E2')).toBe(true)
  expect(mayWrite('ai/tasks/tasks-in-testing.md', owns, 'E2')).toBe(true)
  expect(mayWrite('.claude/agent-memory/meto-epic-E2/MEMORY.md', owns, 'E2')).toBe(true)
  expect(mayWrite('src/shared/x.ts', owns, 'E2')).toBe(false)
  expect(mayWrite('package.json', owns, 'E2')).toBe(false)
})

test('makes paths relative to the project, Windows drives included', () => {
  expect(relativeTo('C:\\Work\\App\\src\\a.ts', 'c:\\work\\app')).toBe('src/a.ts')
  expect(relativeTo('/home/me/app/src/a.ts', '/home/me/app')).toBe('src/a.ts')
  expect(relativeTo('src/a.ts', '/home/me/app')).toBe('src/a.ts')
})

test('holds back an epic whose slice needs open work', () => {
  const todo = parseSlices(TODO)
  const open = parseSlices('## [slice-011] -- Profile link\n**Epic:** E1 | **Size:** S')
  expect(blockedByOpenWork(todo, open, 'E2')?.[1]).toBe('slice-011')
  expect(blockedByOpenWork(todo, open, 'E3')).toBeUndefined()
})

test('recognises meto agents and epics', () => {
  expect(epicOf('meto-epic-E2')).toBe('E2')
  expect(epicOf('meto:meto-epic-E2')).toBe('E2')
  expect(epicOf('meto-developer')).toBeUndefined()
  expect(isMetoAgent('meto-tester')).toBe(true)
  expect(isMetoAgent('general-purpose')).toBe(false)
})

test('picks the next slice id above every board', () => {
  const { max, width } = highestSlice(['## [slice-099]', 'Needs: slice-172', '## [slice-0007]'])
  expect(max).toBe(172)
  expect(width).toBe(4)
  expect(sliceId(max + 1, 3)).toBe('slice-173')
})


test('reads git diff --shortstat', () => {
  expect(parseShortstat(' 3 files changed, 10 insertions(+), 2 deletions(-)')).toEqual({ added: 10, removed: 2 })
  expect(parseShortstat(' 1 file changed, 1 deletion(-)')).toEqual({ added: 0, removed: 1 })
  expect(parseShortstat('')).toEqual({ added: 0, removed: 0 })
})

const BOARD = [
  { key: 'backlog', label: 'Backlog', count: 11, slices: [] },
  { key: 'todo', label: 'Todo', count: 4, slices: parseSlices(`## [slice-160] -- Contacts export
## [slice-161] -- Follow-up reminders
## [Lom_Slice-0044] -- Pro page copy
## [slice-162] -- Fourth`) },
  { key: 'in-progress', label: 'In progress', count: 1, slices: parseSlices('## [slice-159] -- Share sheet') },
  { key: 'testing', label: 'Testing', count: 0, slices: [] },
  { key: 'done', label: 'Done', count: 206, slices: [] },
]

test('builds the minimal board', () => {
  const view = boardView(
    BOARD,
    { model: 'Opus 5.5', percent: 6, branch: 'lom-ro-copy', added: 106, removed: 539 },
    [
      { id: 'E1', name: 'Foundation', status: 'testing-ready', done: 20, blocker: '' },
      { id: 'E2', name: 'Auth', status: 'on-track', done: 22, blocker: '' },
      { id: 'E4', name: 'Receiver', status: 'blocked', done: 33, blocker: 'needs E2 export' },
    ],
    true,
    10,
  )
  expect(view.session).toBe('Opus 5.5 · ctx 6% · lom-ro-copy +106 -539')
  expect(view.counts).toBe('todo 4 · doing 1 · testing 0 · done 206')
  expect(view.rows.map(r => r.text)).toEqual([
    'now   slice-159  Share sheet',
    'next  slice-160  Contacts export',
    '      slice-161  Follow-up reminders',
    '      Lom_Slice-0044  Pro page copy',
  ])
  expect(view.alerts).toEqual(['E4 blocked: needs E2 export', 'E1 ready to test', 'handoff due'])
})

test('keeps the board quiet when nothing needs you', () => {
  const view = boardView(BOARD, { model: 'Opus 5.5', branch: 'main', added: 0, removed: 0 }, [], false, 1)
  expect(view.session).toBe('Opus 5.5 · main')
  expect(view.rows).toHaveLength(1)
  expect(view.alerts).toEqual([])
})
