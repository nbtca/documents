import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { ARCHIVED_CONFIG, MARKDOWNLINT_CONFIG } from './markdown-validation'

function jsonc(path: string): Record<string, unknown> {
  return JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8').replace(/^\s*\/\/.*$/gm, ''))
}

describe('markdownlint config', () => {
  it('matches the root config used by CI', () => {
    expect(jsonc('../.markdownlint-cli2.jsonc').config).toEqual(MARKDOWNLINT_CONFIG)
  })

  it('matches the archived directory config used by CI', () => {
    expect(jsonc('../archived/.markdownlint.jsonc')).toEqual(ARCHIVED_CONFIG)
  })
})
