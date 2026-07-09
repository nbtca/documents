import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  collectNavigationLinks,
  extractH1,
  extractMarkdownLinks,
  findDuplicateRoutePaths,
  listActiveDocs,
  listArchivedDocs,
  resolveInternalLink,
  routePathFromRelativePath,
} from '../utils/content-contract'

let tempDir: string | undefined

afterEach(() => {
  if (tempDir)
    rmSync(tempDir, { force: true, recursive: true })
  tempDir = undefined
})

describe('content contract', () => {
  it('classifies active and archived document trees separately', () => {
    tempDir = mkdtempSync(path.join(tmpdir(), 'content-contract-'))
    writeFixture('tutorial/index.md', '# Tutorial')
    writeFixture('process/2025/example.md', '# Process')
    writeFixture('repair/guide.md', '# Repair')
    writeFixture('archived/2025/meeting.md', '# Meeting')

    // repair uses the hub model, so it is not a contract-governed active doc.
    expect(listActiveDocs(tempDir).map(doc => doc.relativePath)).toEqual([
      'process/2025/example.md',
      'tutorial/index.md',
    ])
    expect(listArchivedDocs(tempDir).map(doc => doc.relativePath)).toEqual([
      'archived/2025/meeting.md',
    ])
  })

  it('extracts the first prose H1 and ignores fenced code', () => {
    const title = extractH1([
      '```sh',
      '# not a heading',
      '```',
      '',
      '# Real heading',
    ].join('\n'))

    expect(title).toBe('Real heading')
  })

  it('generates stable VitePress route paths from markdown files', () => {
    expect(routePathFromRelativePath('tutorial/2025/example.md')).toBe('/tutorial/2025/example')
    expect(routePathFromRelativePath('repair/guide.md')).toBe('/repair/guide')
  })

  it('detects duplicate route paths', () => {
    const duplicateRoutes = findDuplicateRoutePaths([
      docFixture('tutorial/guide.md', '/tutorial/guide'),
      docFixture('process/guide.md', '/process/guide'),
      docFixture('repair/guide.md', '/tutorial/guide'),
    ])

    expect(duplicateRoutes).toEqual([
      {
        files: ['tutorial/guide.md', 'repair/guide.md'],
        routePath: '/tutorial/guide',
      },
    ])
  })

  it('collects nav and sidebar links with nested bases', () => {
    const links = collectNavigationLinks({
      themeConfig: {
        nav: [{ link: '/tutorial/' }],
        sidebar: {
          '/tutorial/': [
            {
              base: '/tutorial/2025/',
              items: [
                { link: 'example' },
              ],
            },
          ],
        },
      },
    })

    expect(links).toEqual([
      '/tutorial/2025/example',
      '/tutorial/index',
    ])
  })

  it('resolves internal document and asset links', () => {
    tempDir = mkdtempSync(path.join(tmpdir(), 'content-contract-links-'))
    writeFixture('tutorial/index.md', '# Tutorial\n[Asset](./assets/example.png)\n[Repair](/repair/guide)')
    writeFixture('tutorial/assets/example.png', '')
    writeFixture('repair/guide.md', '# Repair')

    const links = extractMarkdownLinks(
      '# Tutorial\n[Asset](./assets/example.png)\n[Repair](/repair/guide)',
      'tutorial/index.md',
    )
    const resolutions = links.map(link => resolveInternalLink(link, tempDir))

    expect(resolutions.map(resolution => resolution.status)).toEqual(['ok', 'ok'])
  })
})

function writeFixture(relativePath: string, content: string): void {
  if (!tempDir)
    throw new Error('tempDir must be initialized before writing fixtures')

  const absolutePath = path.join(tempDir, relativePath)
  mkdirSync(path.dirname(absolutePath), { recursive: true })
  writeFileSync(absolutePath, content)
}

function docFixture(relativePath: string, routePath: string) {
  return {
    absolutePath: `/tmp/${relativePath}`,
    category: 'active' as const,
    content: '# Fixture',
    domain: relativePath.split('/')[0],
    h1: 'Fixture',
    relativePath,
    routePath,
  }
}
