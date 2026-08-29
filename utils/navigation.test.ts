import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { sidebar as archivedSidebar } from '../.vitepress/sidebars/archived'
import {
  getTitle,
  groupFromDir,
  joinBasePath,
  listDirectories,
  listMarkdownFiles,
  pageLink,
} from './navigation'

let tempDir: string

beforeAll(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'test-'))
  writeFileSync(join(tempDir, 'test1.md'), '# First Document')
  writeFileSync(join(tempDir, 'test2.md'), '# Second Document')
  writeFileSync(join(tempDir, 'index.md'), '# Index Document')
  writeFileSync(join(tempDir, 'test.txt'), 'Not a markdown file')
  mkdirSync(join(tempDir, '2024'))
  mkdirSync(join(tempDir, '.hidden'))
})

afterAll(() => {
  rmSync(tempDir, { recursive: true })
})

describe('listMarkdownFiles', () => {
  it('should filter index.md by default', () => {
    const files = listMarkdownFiles(tempDir).map(file => file.filename)
    expect(files).toEqual(['test1.md', 'test2.md'])
  })

  it('should include index.md when requested', () => {
    const files = listMarkdownFiles(tempDir, { includeIndex: true })
      .map(file => file.filename)
    expect(files).toEqual(['index.md', 'test1.md', 'test2.md'])
  })
})

describe('listDirectories', () => {
  it('should list visible child directories only', () => {
    expect(listDirectories(tempDir)).toEqual(['2024'])
  })
})

describe('getTitle', () => {
  it('should extract the first H1 heading', () => {
    const title = getTitle(join(tempDir, 'test1.md'))
    expect(title).toBe('First Document')
  })

  it('should fall back to filename when no heading exists', () => {
    const noHeadingFile = join(tempDir, 'no-heading.md')
    writeFileSync(noHeadingFile, 'Just some text without a heading')
    const title = getTitle(noHeadingFile)
    expect(title).toBe('no-heading')
  })
})

describe('link helpers', () => {
  it('should build absolute page links without markdown extensions', () => {
    expect(pageLink('repair', 'guide.md')).toBe('/repair/guide')
    expect(pageLink('/archived/2025/', '2025-01-24-dev-meeting.md'))
      .toBe('/archived/2025/2025-01-24-dev-meeting')
  })

  // /about/index never matches the /about/ the reader is on.
  it('should link an index page as its directory', () => {
    expect(pageLink('about', 'index')).toBe('/about/')
    expect(pageLink('/archived/', 'index.md')).toBe('/archived/')
  })

  it('should join sidebar base paths with a trailing slash', () => {
    expect(joinBasePath('/archived/2023/', 'meetings'))
      .toBe('/archived/2023/meetings/')
  })
})

describe('archived sidebar', () => {
  it('should sort archived years in descending order', () => {
    const yearTexts = archivedSidebar
      .map(item => item.text)
      .filter((text): text is string => typeof text === 'string' && /^\d{4}$/.test(text))

    const sorted = [...yearTexts].sort((a, b) => Number(b) - Number(a))
    expect(yearTexts).toEqual(sorted)
  })
})

describe('groupFromDir', () => {
  let dir: string

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'group-'))
    writeFileSync(join(dir, 'second.md'), '---\norder: 2\n---\n\n# Second')
    writeFileSync(join(dir, 'first.md'), '---\norder: 1\n---\n\n# First')
    writeFileSync(join(dir, 'zebra.md'), '# Zebra')
    writeFileSync(join(dir, 'apple.md'), '# Apple')
    writeFileSync(join(dir, 'index.md'), '# Index')
  })

  afterAll(() => rmSync(dir, { recursive: true }))

  // The whole point: a contributor adds a markdown file and nothing else.
  it('places ordered pages first, then the rest by title', () => {
    expect(groupFromDir('Group', dir).items?.map(item => item.text)).toEqual([
      'First',
      'Second',
      'Apple',
      'Zebra',
    ])
  })

  it('titles each entry from its heading', () => {
    expect(groupFromDir('Group', dir).items?.[0]).toMatchObject({ text: 'First', link: 'first' })
  })
})
