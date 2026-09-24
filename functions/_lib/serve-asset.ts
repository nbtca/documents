import type { AssetEnv } from './bucket'
import { keyFromMediaPath } from '../../utils/remote-asset'

// Objects are public on purpose: a merged page's <img> has no credentials.
// The key is unguessable and immutable, so a long cache is safe.
export async function onRequestGet(
  { params, env }: { params: { path?: string | string[] }, env: AssetEnv },
): Promise<Response> {
  const key = keyFromMediaPath(params.path)
  if (!key)
    return new Response('找不到这张图。', { status: 404 })
  if (!env.MEDIA)
    return new Response('图片存储还没配好。', { status: 503 })

  const object = await env.MEDIA.get(key)
  if (!object)
    return new Response('找不到这张图。', { status: 404 })

  const headers = new Headers({
    'Content-Type': 'image/webp',
    'Cache-Control': 'public, max-age=31536000, immutable',
    'X-Content-Type-Options': 'nosniff',
  })
  if (object.httpEtag)
    headers.set('ETag', object.httpEtag)

  return new Response(object.body, { status: 200, headers })
}
