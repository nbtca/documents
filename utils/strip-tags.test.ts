import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'
import { describe, expect, it } from 'vitest'

// Written three times before the helper existed; CodeQL caught each one.
describe('tag stripping', () => {
  const STRIP = /replace\(\s*\/<\[\^>\]/
  const SOURCE = /\.(?:ts|mjs|vue)$/

  function walk(dir: string): string[] {
    return readdirSync(dir).flatMap((entry) => {
      if (entry === 'node_modules' || entry === 'dist' || entry === 'cache')
        return []
      const full = join(dir, entry)
      if (statSync(full).isDirectory())
        return walk(full)
      return SOURCE.test(entry) ? [full] : []
    })
  }

  it('happens only inside stripTags', () => {
    const roots = ['utils', 'scripts', '.vitepress'].map(dir => join(process.cwd(), dir))
    const stray = roots.flatMap(walk).flatMap((file) => {
      const lines = readFileSync(file, 'utf8').split('\n')
      return lines.flatMap((line, index) => {
        if (!STRIP.test(line))
          return []
        const enclosing = lines.slice(0, index).reverse().find(candidate => /^\s*(?:export\s+)?function\s+\w+/.test(candidate))
        return /function stripTags\b/.test(enclosing ?? '')
          ? []
          : [`${file.replace(process.cwd(), '')}:${index + 1}`]
      })
    })

    expect(stray).toEqual([])
  })
})
