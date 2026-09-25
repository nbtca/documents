import { afterEach, describe, expect, it, vi } from 'vitest'
import { onRequestGet } from '../functions/_lib/serve-asset'
import { onRequestPost } from '../functions/api/assets'
import { onRequestGet as routedGet } from '../functions/media/[[path]]'
import { MAX_ASSET_BYTES } from '../utils/remote-asset'

const ID = '00000000-0000-4000-8000-000000000000'
const KEY = `2026/09/${ID}.webp`
const SECRET = 'secret'
const CLIENT_ID = 'Ov23liLyXZEIgI9vKNV6'

function webp(bytes = 16): Uint8Array {
  const body = new Uint8Array(bytes)
  body.set([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50])
  return body
}

function bucket() {
  const store = new Map<string, { bytes: Uint8Array, type?: string }>()
  return {
    store,
    async put(key: string, value: ArrayBuffer | ArrayBufferView, options?: { httpMetadata?: { contentType?: string } }) {
      const bytes = value instanceof Uint8Array ? value : new Uint8Array(value as ArrayBuffer)
      store.set(key, { bytes, type: options?.httpMetadata?.contentType })
    },
    async get(key: string) {
      const found = store.get(key)
      if (!found)
        return null
      return { body: found.bytes, httpEtag: '"asset"' }
    },
  }
}

function post(body: BodyInit, headers: Record<string, string> = {}): Request {
  return new Request('https://docs.nbtca.space/api/assets', {
    method: 'POST',
    headers,
    body,
  })
}

describe('asset upload', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  function allowGitHub(): void {
    vi.stubGlobal('fetch', async () => new Response('{}', { status: 200 }))
    vi.spyOn(crypto, 'randomUUID').mockReturnValue(ID)
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-24T03:00:00Z'))
  }

  it('stores a webp and returns the path the site serves it on', async () => {
    const seen: { url: string, authorization: string | null, body: unknown }[] = []
    vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
      seen.push({
        url: String(url),
        authorization: new Headers(init?.headers).get('Authorization'),
        body: init?.body ? JSON.parse(String(init.body)) : undefined,
      })
      return new Response('{}', { status: 200 })
    })
    vi.spyOn(crypto, 'randomUUID').mockReturnValue(ID)
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-24T03:00:00Z'))

    const assets = bucket()
    const bytes = webp()

    const response = await onRequestPost({
      request: post(bytes, {
        'Authorization': 'Bearer gho_member',
        'Content-Type': 'image/webp',
      }),
      env: { MEDIA: assets, GITHUB_CLIENT_SECRET: SECRET },
    })

    expect(response.status).toBe(201)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(await response.json()).toEqual({ url: `/media/${KEY}` })
    expect(assets.store.get(KEY)?.type).toBe('image/webp')
    expect(assets.store.get(KEY)?.bytes).toEqual(bytes)
    expect(seen).toEqual([{
      url: `https://api.github.com/applications/${CLIENT_ID}/token`,
      authorization: `Basic ${btoa(`${CLIENT_ID}:${SECRET}`)}`,
      body: { access_token: 'gho_member' },
    }])
  })

  it('refuses a caller GitHub does not recognise', async () => {
    vi.stubGlobal('fetch', async () => new Response('nope', { status: 404 }))
    const assets = bucket()

    const missing = await onRequestPost({
      request: post(webp(), { 'Content-Type': 'image/webp' }),
      env: { MEDIA: assets, GITHUB_CLIENT_SECRET: SECRET },
    })
    const foreign = await onRequestPost({
      request: post(webp(), {
        'Authorization': 'Bearer gho_other',
        'Content-Type': 'image/webp',
      }),
      env: { MEDIA: assets, GITHUB_CLIENT_SECRET: SECRET },
    })

    expect(missing.status).toBe(401)
    expect(foreign.status).toBe(401)
    expect(assets.store.size).toBe(0)
  })

  it('does not write when the token cannot be checked', async () => {
    vi.stubGlobal('fetch', async () => new Response('down', { status: 500 }))
    const assets = bucket()

    const response = await onRequestPost({
      request: post(webp(), {
        'Authorization': 'Bearer gho_member',
        'Content-Type': 'image/webp',
      }),
      env: { MEDIA: assets, GITHUB_CLIENT_SECRET: SECRET },
    })

    expect(response.status).toBe(502)
    expect(assets.store.size).toBe(0)
  })

  it('says so when the deployment has no bucket or no way to check the login', async () => {
    const assets = bucket()
    const noBucket = await onRequestPost({
      request: post(webp(), { Authorization: 'Bearer gho_member' }),
      env: {},
    })
    const noSecret = await onRequestPost({
      request: post(webp(), { 'Authorization': 'Bearer gho_member', 'Content-Type': 'image/webp' }),
      env: { MEDIA: assets },
    })

    expect(noBucket.status).toBe(503)
    expect(noSecret.status).toBe(503)
    expect(assets.store.size).toBe(0)
  })

  it('rejects a body that is not a webp, and one that is too large', async () => {
    allowGitHub()
    const assets = bucket()
    const env = { MEDIA: assets, GITHUB_CLIENT_SECRET: SECRET }
    const headers = { 'Authorization': 'Bearer gho_member', 'Content-Type': 'image/webp' }

    const disguised = await onRequestPost({
      request: post(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]), headers),
      env,
    })
    expect(disguised.status).toBe(415)

    const huge = await onRequestPost({
      request: post(webp(MAX_ASSET_BYTES + 1), headers),
      env,
    })
    expect(huge.status).toBe(413)
    expect(assets.store.size).toBe(0)
  })
})

describe('asset read', () => {
  it('serves a stored object and ignores a key we would not have written', async () => {
    const assets = bucket()
    await assets.put(KEY, webp())

    expect(routedGet).toBe(onRequestGet)

    const found = await onRequestGet({ params: { path: ['2026', '09', `${ID}.webp`] }, env: { MEDIA: assets } })
    expect(found.status).toBe(200)
    expect(found.headers.get('Content-Type')).toBe('image/webp')
    expect(found.headers.get('Cache-Control')).toContain('immutable')
    expect(found.headers.get('X-Content-Type-Options')).toBe('nosniff')
    expect(new Uint8Array(await found.arrayBuffer())).toEqual(webp())

    const escaped = await onRequestGet({
      params: { path: ['..', '..', 'package.json'] },
      env: { MEDIA: assets },
    })
    expect(escaped.status).toBe(404)
  })

  it('distinguishes a missing object from a missing bucket', async () => {
    const assets = bucket()
    const missing = await onRequestGet({ params: { path: KEY }, env: { MEDIA: assets } })
    expect(missing.status).toBe(404)

    const unconfigured = await onRequestGet({ params: { path: KEY }, env: {} })
    expect(unconfigured.status).toBe(503)
  })
})
