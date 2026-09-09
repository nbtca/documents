import { globSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { HUB_DOC_DIRS } from '../../../checks/content-contract'
import { checklistFor, DESTINATIONS, draftSlug, frontmatterFor, pathFor, routeFor } from './destinations'

const AT = new Date('2026-09-07T04:00:00Z')

describe('new page destinations', () => {
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

  it('offer a skeleton markdownlint will not reject', () => {
    // A trailing space is MD009, and the heading a member types into is the
    // only line allowed to hold one on the way out.
    const offending = DESTINATIONS
      .filter(d => d.outline)
      .flatMap(d => d.outline!.split('\n').slice(1).map(line => [d.id, line] as const))
      .filter(([, line]) => line !== line.trimEnd() || line.trim() === '##')

    expect(offending).toEqual([])
    expect(DESTINATIONS.filter(d => d.outline && !d.outline.startsWith('# \n'))).toEqual([])
  })

  it('build the path and the route from the same choice', () => {
    const tutorial = DESTINATIONS.find(d => d.id === 'tutorial')!
    expect(pathFor(tutorial, 'edu-email')).toBe('tutorial/edu-email.md')
    expect(routeFor(tutorial, 'edu-email')).toBe('/tutorial/edu-email')
  })
})

describe('generated frontmatter', () => {
  it('names the member and dates it as the contract wants', () => {
    expect(frontmatterFor('m1ngsama', AT))
      .toBe('---\nmaintainers:\n  - user: m1ngsama\n    since: 2026-09\n---\n\n')
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

describe('generated frontmatter, without a GitHub identity', () => {
  it('leaves something a person will notice, not a name that is no account', () => {
    expect(frontmatterFor('本地开发', AT)).toContain('user: your-github-login')
    expect(frontmatterFor('m1ngsama', AT)).toContain('user: m1ngsama')
  })

  it('separates the block from the body the way every other page does', () => {
    expect(frontmatterFor('m1ngsama', AT).endsWith('---\n\n')).toBe(true)
  })
})
