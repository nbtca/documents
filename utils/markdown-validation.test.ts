import { describe, expect, it } from 'vitest'
import { fixMarkdown, lintMarkdown } from './markdown-validation'

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

  it('tells the writer how to fix each reported problem', async () => {
    const issues = await lintMarkdown('#Title\n\n```\ncode\n```\n\n::: tip\nText\n', { mermaid: false })

    expect(issues.length).toBeGreaterThan(0)
    for (const problem of issues)
      expect(problem.fix).toBeTruthy()
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

  it('links each rule to its entry in the Markdown guide', async () => {
    const [problem] = await lintMarkdown('#Title\n', { mermaid: false })

    expect(problem.information).toBe('/tutorial/markdown#md018')
  })

  it('applies the fixes markdownlint offers', async () => {
    const source = '#Title\n## Sub\n- a\n-  b\n\nSee http://x.com\n'
    const fixed = await fixMarkdown(source, await lintMarkdown(source, { mermaid: false }))

    expect(fixed).toBe('# Title\n\n## Sub\n\n- a\n- b\n\nSee <http://x.com>\n')
    expect(await lintMarkdown(fixed, { mermaid: false })).toEqual([])
  })

  it('leaves problems without an automatic fix in place', async () => {
    const source = '# Title\n\n```\ncode\n```\n'
    const issues = await lintMarkdown(source, { mermaid: false })

    expect(issues.some(problem => problem.rule === 'MD040' && !problem.fixInfo)).toBe(true)
    expect(await fixMarkdown(source, issues)).toBe(source)
  })

  it('explains markdownlint details in Chinese', async () => {
    const issues = await lintMarkdown('# A\n\n### B\n\n| a | b |\n| - | - |\n| 1 |\n', { mermaid: false })

    expect(issues.map(problem => problem.detail)).toEqual([
      '应该写成 h2，现在是 h3',
      '表头有 2 列，这一行有 1 列',
    ])
  })

  it('points at the Mermaid source instead of parser tokens', async () => {
    const [problem] = await lintMarkdown('# T\n\n```mermaid\ngraph TD\nA-->[\n```\n')

    expect(problem.detail).toBe('在 [ 附近出错')
  })
})
