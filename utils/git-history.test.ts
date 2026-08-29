import { describe, expect, it } from 'vitest'
import { loginFor } from './git-history'

describe('commit author to GitHub account', () => {
  it('reads the login out of a noreply address', () => {
    expect(loginFor('128229751+m1ngsama@users.noreply.github.com', 'm1ng')).toBe('m1ngsama')
    // The oldest ones predate the numeric prefix.
    expect(loginFor('zzh0u@users.noreply.github.com', 'zzh0u')).toBe('zzh0u')
  })

  it('falls back to the name table for personal addresses', () => {
    expect(loginFor('someone@example.com', '小明')).toBe('m1ngsama')
    expect(loginFor('someone@example.com', 'Clas Wen')).toBe('wen-templari')
  })

  it('returns nothing rather than guessing', () => {
    expect(loginFor('someone@example.com', 'A Stranger')).toBeUndefined()
  })
})
