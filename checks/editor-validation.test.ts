import { describe, expect, it } from 'vitest'
import { splitFrontmatter } from '../utils/markdown'
import { lintMarkdown } from '../utils/markdown-validation'
import { listDocs } from './content-contract'

describe('editor Markdown validation', () => {
  it('accepts every current page body', async () => {
    const failures: string[] = []

    for (const doc of listDocs()) {
      const issues = await lintMarkdown(splitFrontmatter(doc.content).body, {
        archived: doc.category === 'archived',
        mermaid: false,
      })
      if (issues.length) {
        failures.push(`${doc.relativePath}: ${issues
          .map(problem => `${problem.line}:${problem.column} ${problem.rule}`)
          .join(', ')}`)
      }
    }

    expect(failures).toEqual([])
  }, 30_000)
})
