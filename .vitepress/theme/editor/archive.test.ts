import { globSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { reviewNoteFor, transcribedFrom } from './archive'

describe('telling a transcription from our own record', () => {
  it('names the original a page was copied from', () => {
    expect(transcribedFrom({ archive: { source: '协会档案袋 · 计算机协会归档/2008 年度/陈龙/协会策划' } }))
      .toBe('协会档案袋 · 计算机协会归档/2008 年度/陈龙/协会策划')
  })

  it('leaves a cohort\'s own record alone', () => {
    expect(transcribedFrom({ archive: { source: '协会自有记录，随本仓库保存' } })).toBeUndefined()
  })

  it('treats a page with no archive block as ordinary', () => {
    expect(transcribedFrom({ title: '维修日' })).toBeUndefined()
    expect(transcribedFrom(undefined)).toBeUndefined()
    expect(transcribedFrom({ archive: {} })).toBeUndefined()
    expect(transcribedFrom({ archive: { source: '  ' } })).toBeUndefined()
  })

  it('says what a reviewer has to check', () => {
    expect(reviewNoteFor('协会档案袋')).toMatch(/只修正了转写错误/)
  })
})

// A page that states no provenance would read as our own record and lose the
// warning, so the archive has to keep saying where each page came from.
describe('the archive itself', () => {
  const pages = globSync('archived/**/*.md').map(path => ({ path, text: readFileSync(path, 'utf8') }))

  it('states a provenance on every page that claims to be archived', () => {
    const silent = pages
      .filter(page => /\narchive:\s*\n/.test(page.text))
      .filter(page => !/\n {2}source: *["']?\S/.test(page.text))
      .map(page => page.path)

    expect(silent).toEqual([])
  })

  it('holds both kinds, so the split is worth making', () => {
    const sources = pages.flatMap(page => page.text.match(/\n {2}source: *["']?([^"'\n]+)/) ?? [])
    expect(pages.some(page => /\n {2}source: *["']?协会自有记录/.test(page.text))).toBe(true)
    expect(pages.some(page => /\n {2}source: *["']?协会档案袋/.test(page.text))).toBe(true)
    expect(sources.length).toBeGreaterThan(0)
  })
})
