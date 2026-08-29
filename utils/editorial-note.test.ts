import { describe, expect, it } from 'vitest'
import { noteRanges } from './editorial-note'

const p = (text: string) => ({ type: 'paragraph_open', text })
const list = () => ({ type: 'bullet_list_open', text: '' })
const table = () => ({ type: 'table_open', text: '' })
const heading = () => ({ type: 'heading_open', text: '一、正文' })

describe('editorial note ranges', () => {
  it('takes a paragraph that is nothing but a note', () => {
    expect(noteRanges([p('原件照录。'), p('〔编者说明。〕'), p('后文')]))
      .toEqual([[1, 1]])
  })

  it('runs a note across the paragraphs it spans', () => {
    expect(noteRanges([p('〔开头'), p('中段'), p('结尾。〕'), p('正文')]))
      .toEqual([[0, 2]])
  })

  it('keeps a list or table inside the note', () => {
    expect(noteRanges([p('〔开头'), list(), p('中段'), table(), p('结尾。〕')]))
      .toEqual([[0, 4]])
  })

  // The note closes and the document resumes in the same paragraph.
  it('leaves a note that hands back mid-paragraph', () => {
    expect(noteRanges([p('〔待核实〕正文接着往下写。')])).toEqual([])
  })

  it('leaves a note whose bracket never closes', () => {
    expect(noteRanges([p('〔开头'), p('中段'), heading(), p('正文')])).toEqual([])
    expect(noteRanges([p('〔开头'), p('中段')])).toEqual([])
  })

  it('ignores brackets that do not start the paragraph', () => {
    expect(noteRanges([p('交给秘书〔稿二作「办公室」〕，由秘书登记。')])).toEqual([])
  })

  it('finds every note on the page', () => {
    expect(noteRanges([p('〔一。〕'), p('正文'), p('〔二。〕')])).toEqual([[0, 0], [2, 2]])
  })
})
