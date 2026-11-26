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

  it('links each markdownlint rule to its official documentation', async () => {
    const [problem] = await lintMarkdown('#Title\n', { mermaid: false })

    expect(problem.information).toMatch(/\/doc\/md018\.md$/)
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
})
