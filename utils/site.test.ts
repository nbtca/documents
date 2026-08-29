import { describe, expect, it } from 'vitest'
import siteConfig from '../.vitepress/config'
import previewLoader from '../.vitepress/theme/concepts.data'
import {
  collectNavigationLinks,
  extractMarkdownLinks,
  findDuplicateRoutePaths,
  listActiveDocs,
  listArchivedDocs,
  listDocs,
  listRoutedDocs,
  resolveInternalLink,
  ROUTED_DOC_DIRS,
} from '../utils/content-contract'

const activeDocs = listActiveDocs()
const routedDocs = listRoutedDocs()
const navigationLinks = new Set(collectNavigationLinks(siteConfig))

describe('site content contract', () => {
  it('gives every published document a title', () => {
    const missingTitle = routedDocs
      .filter(doc => !doc.title)
      .map(doc => doc.relativePath)

    expect(missingTitle).toEqual([])
  })

  it('generates unique site routes for published documents', () => {
    const invalidRoutes = routedDocs
      .filter(doc => !isRoutedRoute(doc.routePath) || doc.routePath.includes('\\') || doc.routePath.endsWith('.md'))
      .map(doc => `${doc.relativePath} -> ${doc.routePath}`)

    expect(invalidRoutes).toEqual([])
    expect(findDuplicateRoutePaths(routedDocs)).toEqual([])
  })

  // Hub sections are reached by inline links and search, not a sidebar.
  it('exposes every active document through nav or sidebar entries', () => {
    const missingEntries = activeDocs
      .filter(doc => !navigationLinks.has(doc.routePath))
      .map(doc => `${doc.relativePath} -> ${doc.routePath}`)

    expect(missingEntries).toEqual([])
  })

  // VitePress rewrites markdown links to .html, so [x](/templates/y.docx)
  // ships as y.docx.html and 404s. Raw <a href> survives untouched.
  it('links downloadable templates with raw anchors, not markdown syntax', () => {
    const rewritten = routedDocs
      .flatMap(doc => extractMarkdownLinks(doc.content, doc.relativePath))
      .filter(link => link.target.startsWith('/templates/'))
      .map(link => `${link.sourceRelativePath}:${link.line} -> ${link.target}`)

    expect(rewritten).toEqual([])
  })

  it('resolves internal links from published documents to existing files or assets', () => {
    const brokenLinks = routedDocs.flatMap((doc) => {
      return extractMarkdownLinks(doc.content, doc.relativePath)
        .map(link => resolveInternalLink(link))
        .filter(resolution => resolution.status === 'broken')
        .map(resolution => `${doc.relativePath}:${resolution.link.line} -> ${resolution.link.target}`)
    })

    expect(brokenLinks).toEqual([])
  })
})

describe('archive provenance', () => {
  const originals = listArchivedDocs()
    .filter(doc => !doc.relativePath.includes('manual/') && !doc.relativePath.endsWith('index.md'))

  it('states a date and a source for every archived document', () => {
    const incomplete = originals
      .filter(doc => !/^\s{2}date:\s*\S/m.test(doc.content) || !/^\s{2}source:\s*\S/m.test(doc.content))
      .map(doc => doc.relativePath)

    expect(incomplete).toEqual([])
  })

  it('covers every archived document', () => {
    expect(originals.length).toBeGreaterThan(90)
  })
})

describe('last updated', () => {
  it('is never switched off by a page', () => {
    const disabled = routedDocs
      .filter(doc => /^lastUpdated:\s*false\s*$/m.test(doc.content))
      .map(doc => doc.relativePath)

    expect(disabled).toEqual([])
  })
})

describe('maintainers', () => {
  const BLOCK = /^maintainers:\n((?:[ \t].*\n?)+)/m
  const ENTRY = /^\s+- user:\s*\S+\s*$/
  const SINCE = /^\s+since:\s*"?\d{4}-\d{2}"?\s*$/

  const owned = routedDocs.filter(doc => doc.category !== 'archived')

  it('are declared on every page outside the archive', () => {
    const missing = owned
      .filter(doc => !BLOCK.test(doc.content))
      .map(doc => doc.relativePath)

    expect(missing).toEqual([])
  })

  it('name a GitHub account, and date it as YYYY-MM when dated', () => {
    const malformed = owned.flatMap((doc) => {
      const block = doc.content.match(BLOCK)
      if (!block)
        return []
      const lines = block[1].split('\n').filter(line => line.trim())
      const bad = lines.filter(line => !ENTRY.test(line) && !SINCE.test(line))
      return bad.map(line => `${doc.relativePath}: ${line.trim()}`)
    })

    expect(malformed).toEqual([])
  })
})

describe('personal contact details', () => {
  const MOBILE = /(?<!\d)1[3-9]\d{9}(?!\d)/
  // Campus short-dial, which turns up mid-line beside a name.
  const SHORT_DIAL = /(?<![\d\-/.])6\d{5}(?![\d\-/.])/
  // Ten digits from a leading 3. The QQ group IDs the archive keeps are nine.
  const STUDENT_ID = /(?<!\d)3\d{9}(?!\d)/

  it('are absent from every page', () => {
    const found = listDocs().flatMap((doc) => {
      const hits: string[] = []
      doc.content.split(/\r?\n/).forEach((line, index) => {
        if (MOBILE.test(line) || SHORT_DIAL.test(line) || STUDENT_ID.test(line))
          hits.push(`${doc.relativePath}:${index + 1}`)
      })
      return hits
    })

    expect(found).toEqual([])
  })
})

describe('hover preview index', () => {
  it('covers every content page', () => {
    const indexed = new Set(previewLoader.load().map(preview => preview.path))

    const missing = listDocs()
      .map(doc => doc.routePath.replace(/\/index$/, '/'))
      .filter(route => !indexed.has(route))

    expect(missing).toEqual([])
  })

  it('gives every preview a non-empty title', () => {
    const untitled = previewLoader.load()
      .filter(preview => !preview.title.trim())
      .map(preview => preview.path)

    expect(untitled).toEqual([])
  })
})

function isRoutedRoute(routePath: string): boolean {
  return ROUTED_DOC_DIRS.some(domain => routePath.startsWith(`/${domain}/`))
}
