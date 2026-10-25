import { describe, expect, it } from 'vitest'
import { lintMarkdown } from './markdown-validation'

describe('markdown validation', () => {
  it('accepts formatting that the submit path fixes automatically', async () => {
    expect(await lintMarkdown('# Title  \n\n\nBody')).toEqual([])
  })

  it('reports markdownlint rules with their line and column', async () => {
    const issues = await lintMarkdown('#Title\n\nBody\n')

    expect(issues).toContainEqual(expect.objectContaining({
      line: 1,
      column: 1,
      rule: 'MD018',
      message: '井号后需要空格',
    }))
  })

  it('rejects an unclosed fenced code block', async () => {
    const issues = await lintMarkdown('# Title\n\n```text\ncode\n')

    expect(issues).toContainEqual(expect.objectContaining({
      line: 3,
      rule: 'FENCE',
    }))
  })

  it('rejects an unclosed container', async () => {
    const issues = await lintMarkdown('# Title\n\n::: tip\nText\n')

    expect(issues).toContainEqual(expect.objectContaining({
      line: 3,
      rule: 'CONTAINER',
    }))
  })

  it('applies the archived directory overrides', async () => {
    const source = '# Title\n\n## Same\n\nOne.\n\n## Same\n\nTwo.\n'
    const active = await lintMarkdown(source, { mermaid: false })
    const archived = await lintMarkdown(source, { archived: true, mermaid: false })

    expect(active.some(problem => problem.rule === 'MD024')).toBe(true)
    expect(archived.some(problem => problem.rule === 'MD024')).toBe(false)
  })

  it('validates Mermaid syntax at the source line', async () => {
    const issues = await lintMarkdown([
      '# Title',
      '',
      '```mermaid',
      'graph TD',
      'A-->[',
      '```',
      '',
    ].join('\n'))

    expect(issues).toContainEqual(expect.objectContaining({
      line: 5,
      rule: 'MERMAID',
      message: 'Mermaid 图表语法错误',
    }))
  })

  it('accepts a valid Mermaid diagram', async () => {
    const issues = await lintMarkdown([
      '# Title',
      '',
      '```mermaid',
      'graph TD',
      'A-->B',
      '```',
      '',
    ].join('\n'))

    expect(issues).toEqual([])
  })
})
