import { globSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// Written three times before the helper existed; CodeQL caught each one.
describe('tag stripping', () => {
  const STRIP = /replace\(\s*\/<\[\^>\]/

  it('happens only inside stripTags', () => {
    const sources = globSync('{utils,checks,scripts,.vitepress}/**/*.{ts,mjs,vue}', {
      exclude: file => /node_modules|dist|cache/.test(file),
    })
    const stray = sources.flatMap((file) => {
      const lines = readFileSync(file, 'utf8').split('\n')
      return lines.flatMap((line, index) => {
        if (!STRIP.test(line))
          return []
        const enclosing = lines.slice(0, index).reverse().find(candidate => /^\s*(?:export\s+)?function\s+\w+/.test(candidate))
        return /function stripTags\b/.test(enclosing ?? '')
          ? []
          : [`${file}:${index + 1}`]
      })
    })

    expect(stray).toEqual([])
  })
})
