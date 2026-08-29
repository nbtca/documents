import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  collectNavigationLinks,
  extractMarkdownLinks,
  findDuplicateRoutePaths,
  listDocs,
  listRoutedDocs,
  resolveInternalLink,
  routePathFromRelativePath,
} from './content-contract'

let tempDir: string | undefined

afterEach(() => {
  if (tempDir)
    rmSync(tempDir, { force: true, recursive: true })
  tempDir = undefined
})

describe('content contract', () => {
  it('classifies active, hub and archived document trees separately', () => {
    tempDir = mkdtempSync(path.join(tmpdir(), 'content-contract-'))
    writeFixture('about/index.md', '# About')
    writeFixture('tutorial/index.md', '# Tutorial')
    writeFixture('process/2025/example.md', '# Process')
    writeFixture('concepts/college.md', '# College')
    writeFixture('repair/guide.md', '# Repair')
    writeFixture('archived/2025/meeting.md', '# Meeting')

    expect(listDocs(tempDir, 'active').map(doc => doc.relativePath)).toEqual([
      'about/index.md',
      'process/2025/example.md',
      'tutorial/index.md',
    ])
    expect(listDocs(tempDir, 'hub').map(doc => doc.relativePath)).toEqual([
      'concepts/college.md',
      'repair/guide.md',
    ])
    expect(listDocs(tempDir, 'archived').map(doc => doc.relativePath)).toEqual([
      'archived/2025/meeting.md',
    ])
    expect(listRoutedDocs(tempDir).map(doc => doc.relativePath)).not.toContain(
      'archived/2025/meeting.md',
    )
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
