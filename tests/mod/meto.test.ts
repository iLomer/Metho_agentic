import { expect, test } from 'vitest'

import {
  blockedByOpenWork,
  domainOverlap,
  epicOf,
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
    E1: ['src/profile', 'src/lib'],
    E2: ['src/share'],
    E3: ['src/lib/receiver', 'src/receiver'],
  })
})

test('finds overlapping domains at segment boundaries', () => {
  const d = parseDomains(DOMAINS)
  expect(domainOverlap(d.E1 ?? [], d.E3 ?? [])).toEqual(['src/lib', 'src/lib/receiver'])
  expect(domainOverlap(d.E1 ?? [], d.E2 ?? [])).toBeUndefined()
  expect(domainOverlap(['src/share'], ['src/shared'])).toBeUndefined()
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
