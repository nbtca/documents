import { describe, expect, it } from 'vitest'
import { loginFromEmail } from './git-history'

describe('commit author to GitHub account', () => {
  it('reads the login out of a noreply address', () => {
    expect(loginFromEmail('128229751+m1ngsama@users.noreply.github.com')).toBe('m1ngsama')
    // The oldest ones predate the numeric prefix.
    expect(loginFromEmail('zzh0u@users.noreply.github.com')).toBe('zzh0u')
  })

  it('falls back to the table for personal addresses', () => {
    expect(loginFromEmail('contact@m1ng.space')).toBe('m1ngsama')
    expect(loginFromEmail('CLAS.WEN@icloud.com')).toBe('wen-templari')
  })

  it('returns nothing rather than guessing', () => {
    expect(loginFromEmail('someone@example.com')).toBeUndefined()
  })
})
