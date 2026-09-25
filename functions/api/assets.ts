import type { AssetEnv } from '../_lib/bucket'
import { assetKey, isWebp, MAX_ASSET_BYTES, mediaUrl } from '../../utils/remote-asset'

// Base64 is about 4/3 of the bytes, plus the JSON wrapper.
const MAX_JSON_BYTES = MAX_ASSET_BYTES * 2

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

function bytesFromBase64(value: string): Uint8Array | undefined {
  try {
    const binary = atob(value.replace(/\s/g, ''))
    const bytes = new Uint8Array(binary.length)
    for (let index = 0; index < binary.length; index++)
      bytes[index] = binary.charCodeAt(index)
    return bytes
  }
  catch {
    return undefined
  }
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
  if (!env.MEDIA)
    return json({ message: '图片存储还没配好。告诉维护者检查 R2 绑定 MEDIA。' }, 503)

  const allowed = await githubAllows(request, env.GITHUB_CLIENT_SECRET)
  if (allowed === 'unconfigured')
    return json({ message: '登录校验还没配好。告诉维护者检查 GITHUB_CLIENT_SECRET。' }, 503)
  if (allowed === 'denied')
    return json({ message: '登录已失效，请重新登录。' }, 401)
  if (allowed === 'unreachable')
    return json({ message: '暂时没法确认登录，稍后再试。' }, 502)

  const declared = Number(request.headers.get('Content-Length'))
  if (Number.isFinite(declared) && declared > MAX_JSON_BYTES)
    return json({ message: '这张图太大了。' }, 413)

  const payload = await request.json().catch(() => undefined) as { base64?: unknown } | undefined
  const encoded = typeof payload?.base64 === 'string' ? payload.base64 : ''
  const bytes = encoded ? bytesFromBase64(encoded) : undefined
  if (!bytes?.byteLength)
    return json({ message: '没有收到图片。' }, 400)
  if (bytes.byteLength > MAX_ASSET_BYTES)
    return json({ message: '这张图太大了。' }, 413)
  // The editor has already flattened PNG, JPEG and GIF to one WebP frame.
  if (!isWebp(bytes))
    return json({ message: '图片没有转换成功，请重新插入。' }, 415)

  const key = assetKey()
  await env.MEDIA.put(key, bytes, { httpMetadata: { contentType: 'image/webp' } })
  return json({ url: mediaUrl(key) }, 201)
}
