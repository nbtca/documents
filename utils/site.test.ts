import { describe, expect, it } from 'vitest'
import siteConfig from '../.vitepress/config'
import {
  ACTIVE_DOC_DIRS,
  collectNavigationLinks,
  extractMarkdownLinks,
  findDuplicateRoutePaths,
  listActiveDocs,
  resolveInternalLink,
} from '../utils/content-contract'

const activeDocs = listActiveDocs()
const navigationLinks = new Set(collectNavigationLinks(siteConfig))

describe('site content contract', () => {
  it('extracts an H1 from every active document', () => {
    const missingH1 = activeDocs
      .filter(doc => !doc.h1)
      .map(doc => doc.relativePath)

    expect(missingH1).toEqual([])
  })

  it('generates unique site routes for active documents', () => {
    const invalidRoutes = activeDocs
      .filter(doc => !isActiveRoute(doc.routePath) || doc.routePath.includes('\\') || doc.routePath.endsWith('.md'))
      .map(doc => `${doc.relativePath} -> ${doc.routePath}`)

    expect(invalidRoutes).toEqual([])
    expect(findDuplicateRoutePaths(activeDocs)).toEqual([])
  })

  it('exposes every active document through nav or sidebar entries', () => {
    const missingEntries = activeDocs
      .filter(doc => !navigationLinks.has(doc.routePath))
      .map(doc => `${doc.relativePath} -> ${doc.routePath}`)

    expect(missingEntries).toEqual([])
  })

  it('resolves internal links from active documents to existing files or assets', () => {
    const brokenLinks = activeDocs.flatMap((doc) => {
      return extractMarkdownLinks(doc.content, doc.relativePath)
        .map(link => resolveInternalLink(link))
        .filter(resolution => resolution.status === 'broken')
        .map(resolution => `${doc.relativePath}:${resolution.link.line} -> ${resolution.link.target}`)
    })

    expect(brokenLinks).toEqual([])
  })
})

function isActiveRoute(routePath: string): boolean {
  return ACTIVE_DOC_DIRS.some(domain => routePath.startsWith(`/${domain}/`))
}
