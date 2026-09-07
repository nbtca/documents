import { globSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { HUB_DOC_DIRS } from '../../../checks/content-contract'
import { checklistFor, DESTINATIONS, draftSlug, frontmatterFor, pathFor, routeFor } from './destinations'

const AT = new Date('2026-09-07T04:00:00Z')

describe('new page destinations', () => {
  // A page in a directory no sidebar scans is invisible, and the contributor
  // meets the nav contract as a CI failure they cannot act on.
  it('only offer directories a generated sidebar actually scans', () => {
    const scanned = new Set(
      globSync('.vitepress/sidebars/*.ts')
        .flatMap(file => [...readFileSync(file, 'utf8').matchAll(/groupFromDir\([^,]+,\s*'([^']+)'/g)])
        .map(match => match[1]),
    )

    const unreachable = DESTINATIONS
      .filter(destination => !destination.hub && !scanned.has(destination.dir))
      .map(destination => `${destination.label} -> ${destination.dir}`)

    expect(unreachable).toEqual([])
  })

  // The hub flag decides whether the reviewer is told to link the page from a
  // section index, so it has to mean what the contract means by "hub".
  it('flag as hub exactly the trees the nav contract exempts', () => {
    const exempt = new Set<string>(HUB_DOC_DIRS)
    const wrong = DESTINATIONS
      .filter(destination => Boolean(destination.hub) !== exempt.has(destination.dir))
      .map(destination => destination.dir)

    expect(wrong).toEqual([])
  })

  it('describe every destination, so choosing is also learning the rule', () => {
    expect(DESTINATIONS.filter(d => !d.what.trim() || !d.how.trim())).toEqual([])
  })

  it('build the path and the route from the same choice', () => {
    const tutorial = DESTINATIONS.find(d => d.id === 'tutorial')!
    expect(pathFor(tutorial, 'edu-email')).toBe('tutorial/2025/edu-email.md')
    expect(routeFor(tutorial, 'edu-email')).toBe('/tutorial/2025/edu-email')
  })
})

describe('generated frontmatter', () => {
  it('names the member and dates it as the contract wants', () => {
    expect(frontmatterFor('m1ngsama', AT))
      .toBe('---\nmaintainers:\n  - user: m1ngsama\n    since: 2026-09\n---\n')
  })
})

describe('reviewer checklist', () => {
  const tutorial = DESTINATIONS.find(d => d.id === 'tutorial')!
  const concepts = DESTINATIONS.find(d => d.id === 'concepts')!

  it('asks for a real filename while the draft one is still in place', () => {
    expect(draftSlug(AT)).toBe('draft-20260907')
    expect(checklistFor(tutorial, draftSlug(AT))).toHaveLength(1)
    expect(checklistFor(tutorial, 'edu-email')).toEqual([])
  })

  it('asks for a hub link only where there is no sidebar to find the page', () => {
    expect(checklistFor(concepts, 'volunteer-hours').join()).toMatch(/concepts\/index\.md/)
    expect(checklistFor(tutorial, 'edu-email').join()).not.toMatch(/index\.md/)
  })
})
