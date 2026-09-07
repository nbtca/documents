import { afterEach, describe, expect, it, vi } from 'vitest'
import { onRequestPost } from '../functions/api/auth/github'

const ENV = { GITHUB_CLIENT_SECRET: 'secret' }

function post(body: unknown): Request {
  return new Request('https://docs.nbtca.space/api/auth/github', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

function githubReplies(body: unknown, status = 200): void {
  vi.stubGlobal('fetch', async () => new Response(JSON.stringify(body), { status }))
}

describe('token exchange', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('hands back the token and nothing else', async () => {
    githubReplies({ access_token: 'gho_x', scope: 'public_repo', token_type: 'bearer' })

    const response = await onRequestPost({ request: post({ code: 'c' }), env: ENV })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ access_token: 'gho_x' })
  })

  it('never caches a response carrying a token', async () => {
    githubReplies({ access_token: 'gho_x' })

    const response = await onRequestPost({ request: post({ code: 'c' }), env: ENV })

    expect(response.headers.get('Cache-Control')).toBe('no-store')
  })

  // GitHub answers 200 for a spent code; taking status at face value would
  // have stored `undefined` as the token.
  it('fails on a spent code even though GitHub answers 200', async () => {
    githubReplies({ error: 'bad_verification_code', error_description: 'The code passed is incorrect or expired.' })

    const response = await onRequestPost({ request: post({ code: 'spent' }), env: ENV })

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ error: 'bad_verification_code' })
  })

  it('refuses a request with no code', async () => {
    const response = await onRequestPost({ request: post({}), env: ENV })

    expect(response.status).toBe(400)
  })

  it('says so when the deployment has no credentials', async () => {
    const response = await onRequestPost({
      request: post({ code: 'c' }),
      env: { GITHUB_CLIENT_SECRET: '' },
    })

    expect(response.status).toBe(503)
  })
})
