import type { AssetEnv } from '../_lib/bucket'
import { assetKey, isWebp, MAX_ASSET_BYTES, mediaUrl } from '../../utils/remote-asset'

// Public by design, same value as the OAuth exchange. The secret stays in env.
const CLIENT_ID = 'Ov23liLyXZEIgI9vKNV6'
const CHECK_TOKEN = `https://api.github.com/applications/${CLIENT_ID}/token`

interface Env extends AssetEnv {
  GITHUB_CLIENT_SECRET?: string
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })
}

// Stop once the cap is passed, instead of buffering a body up to the platform limit.
async function readLimited(request: Request, max: number): Promise<Uint8Array | undefined> {
  const declared = Number(request.headers.get('Content-Length'))
  if (Number.isFinite(declared) && declared > max)
    return undefined
  if (!request.body)
    return new Uint8Array()

  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done)
      break
    total += value.byteLength
    if (total > max) {
      await reader.cancel()
      return undefined
    }
    chunks.push(value)
  }

  const bytes = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return bytes
}

// A personal access token would also pass GET /user. This asks GitHub whether
// the token was issued by this site's OAuth app, which is the editor's login.
async function githubAllows(
  request: Request,
  secret: string | undefined,
): Promise<'ok' | 'denied' | 'unconfigured' | 'unreachable'> {
  if (!secret)
    return 'unconfigured'

  const header = request.headers.get('Authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : ''
  if (!token)
    return 'denied'

  try {
    const response = await fetch(CHECK_TOKEN, {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Basic ${btoa(`${CLIENT_ID}:${secret}`)}`,
        'Content-Type': 'application/json',
        'User-Agent': 'nbtca-documents',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({ access_token: token }),
    })
    await response.body?.cancel()
    if (response.ok)
      return 'ok'
    // 404 is an unknown token. 401 is our own client secret being rejected.
    if (response.status === 404)
      return 'denied'
    if (response.status === 401)
      return 'unconfigured'
    return 'unreachable'
  }
  catch {
    return 'unreachable'
  }
}

export async function onRequestPost(
  { request, env }: { request: Request, env: Env },
): Promise<Response> {
  if (!env.ASSETS)
    return json({ message: '图片存储还没配好。告诉维护者检查 R2 绑定 ASSETS。' }, 503)

  const allowed = await githubAllows(request, env.GITHUB_CLIENT_SECRET)
  if (allowed === 'unconfigured')
    return json({ message: '登录校验还没配好。告诉维护者检查 GITHUB_CLIENT_SECRET。' }, 503)
  if (allowed === 'denied')
    return json({ message: '登录已失效，请重新登录。' }, 401)
  if (allowed === 'unreachable')
    return json({ message: '暂时没法确认登录，稍后再试。' }, 502)

  const type = request.headers.get('Content-Type') ?? ''
  if (!type.startsWith('image/webp'))
    return json({ message: '只接受 WebP 图片。' }, 415)

  const bytes = await readLimited(request, MAX_ASSET_BYTES)
  if (bytes === undefined)
    return json({ message: '这张图太大了。' }, 413)
  if (!isWebp(bytes))
    return json({ message: '只接受 WebP 图片。' }, 415)

  const key = assetKey()
  await env.ASSETS.put(key, bytes, { httpMetadata: { contentType: 'image/webp' } })
  return json({ url: mediaUrl(key) }, 201)
}
