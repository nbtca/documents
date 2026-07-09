import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { sidebar as archivedSidebar } from '../archived/sidebar'
import {
  getTitle,
  joinBasePath,
  listDirectories,
  listMarkdownFiles,
  pageLink,
  scanDir,
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

describe('scanDir', () => {
  it('should return only markdown files with correct links', () => {
    const res = scanDir(tempDir)
    expect(res).toHaveLength(2)
    res.forEach((item) => {
      expect(item.filename).toMatch(/\.md$/)
      expect(item.link).toMatch(/^\/.*\/test\d$/)
    })
  })

  it('should strip .md extension from link', () => {
    const res = scanDir(tempDir)
    const item = res.find(r => r.filename === 'test1.md')!
    expect(item.link).not.toContain('.md')
  })

  it('should return an empty array if no markdown files are found', () => {
    const emptyDir = mkdtempSync(join(tmpdir(), 'empty-'))
    const res = scanDir(emptyDir)
    expect(res).toEqual([])
    rmSync(emptyDir, { recursive: true })
  })
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
    expect(pageLink('/archived/2025/', '2025.01.24开发部例会.md'))
      .toBe('/archived/2025/2025.01.24开发部例会')
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
