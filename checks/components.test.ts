import { globSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// An unknown tag renders as nothing at all: the page comes back blank, the
// build stays green, and only a human clicking through ever finds out.
describe('components used in markdown', () => {
  const registered = new Set(
    readFileSync('.vitepress/theme/components.ts', 'utf8')
      .matchAll(/^import (\w+) from/gm)
      .map(match => match[1]),
  )

  it('resolve either globally or from the page\'s own script setup', () => {
    const pages = globSync('**/*.md', { exclude: file => /node_modules/.test(file) })

    const unresolved = pages.flatMap((file) => {
      const source = readFileSync(file, 'utf8')
      const imported = new Set(
        source.matchAll(/^import (\w+) from/gm).map(match => match[1]),
      )

      return [...new Set(source.matchAll(/<([A-Z]\w+)[\s/>]/g).map(match => match[1]))]
        .filter(tag => !registered.has(tag) && !imported.has(tag))
        .map(tag => `${file}: <${tag}>`)
    })

    expect(unresolved).toEqual([])
  })
})
