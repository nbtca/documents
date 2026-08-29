import { describe, expect, it } from 'vitest'
import { branchNameFor, decodeContent, encodeContent } from './github'

describe('content encoding', () => {
  it('survives a round trip through base64', () => {
    const markdown = '# 第七届计算机知识竞赛\n\n〔编者〕原件为打印版，选项后括号留空。\n'
    expect(decodeContent(encodeContent(markdown))).toBe(markdown)
  })

  it('reads the padded, newline-wrapped base64 the API returns', () => {
    const encoded = encodeContent('维修日').replace(/(.{4})/g, '$1\n')
    expect(decodeContent(encoded)).toBe('维修日')
  })
})

describe('branch name', () => {
  const at = new Date('2026-08-29T11:30:00Z')

  it('keeps the page readable in the branch', () => {
    expect(branchNameFor('tutorial/2025/edu-email.md', at)).toBe('edit/tutorial-2025-edu-email-202608291130')
  })

  it('leaves no empty ref component when the filename is all CJK', () => {
    expect(branchNameFor('archived/2014/第七届.md', at)).toBe('edit/archived-2014-202608291130')
  })

  it('still names a branch when nothing survives slugging', () => {
    expect(branchNameFor('第七届.md', at)).toBe('edit/page-202608291130')
  })
})
