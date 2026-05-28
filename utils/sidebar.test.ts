import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getTitle, scanDir } from '../utils/sidebar'

let tempDir: string

beforeAll(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'test-'))
  writeFileSync(join(tempDir, 'test1.md'), '# First Document')
  writeFileSync(join(tempDir, 'test2.md'), '# Second Document')
  writeFileSync(join(tempDir, 'test.txt'), 'Not a markdown file')
})

afterAll(() => {
  rmSync(tempDir, { recursive: true })
})

describe('scanDir', () => {
  it('should return only markdown files with correct structure', () => {
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
