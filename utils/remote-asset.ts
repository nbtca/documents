// Editor uploads are objects in R2, addressed by a key the server chooses.
// The same pattern is what /media serves and what the link checker allows,
// so a reference cannot be aimed at an arbitrary path.

const OBJECT_KEY = /^\d{4}\/\d{2}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$/

// A 1600px WebP is far smaller than this. The cap is what the upload refuses.
export const MAX_ASSET_BYTES = 4 * 1024 * 1024

export function isWebp(bytes: Uint8Array): boolean {
  return bytes.byteLength >= 12
    && bytes[0] === 0x52
    && bytes[1] === 0x49
    && bytes[2] === 0x46
    && bytes[3] === 0x46
    && bytes[8] === 0x57
    && bytes[9] === 0x45
    && bytes[10] === 0x42
    && bytes[11] === 0x50
}

export function assetKey(now = new Date(), id = crypto.randomUUID()): string {
  const year = String(now.getUTCFullYear()).padStart(4, '0')
  const month = String(now.getUTCMonth() + 1).padStart(2, '0')
  return `${year}/${month}/${id}.webp`
}

export function mediaUrl(key: string): string {
  return `/media/${key}`
}

// Root-relative, and only a key we would have written. Anything else — another
// host, a traversal, a hand-edited name — is not an uploaded asset.
export function isRemoteAsset(target: string): boolean {
  return target.startsWith('/media/') && OBJECT_KEY.test(target.slice('/media/'.length))
}

export function keyFromMediaPath(path: string | string[] | undefined): string | undefined {
  if (path === undefined)
    return undefined
  const key = Array.isArray(path) ? path.join('/') : path
  return OBJECT_KEY.test(key) ? key : undefined
}

function quotable(assetPath: string): boolean {
  return Boolean(assetPath) && !/["'\\]/.test(assetPath) && !assetPath.includes('..')
}

// The editor inserts src="/<path>". Match that token, so a shorter name that
// happens to sit inside a longer one is not treated as its own image.
export function referencedImages<T extends { path: string }>(content: string, images: T[]): T[] {
  return images.filter(image => quotable(image.path) && (
    content.includes(`"/${image.path}"`) || content.includes(`'/${image.path}'`)
  ))
}

export function citeUploaded(content: string, images: { path: string, url: string }[]): string {
  const ordered = [...images].sort((a, b) => b.path.length - a.path.length)
  return ordered.reduce((text, image) => {
    if (!quotable(image.path) || !isRemoteAsset(image.url))
      return text
    return text
      .replaceAll(`"/${image.path}"`, `"${image.url}"`)
      .replaceAll(`'/${image.path}'`, `'${image.url}'`)
  }, content)
}

// Upload only images the draft still cites, then swap those citations for the
// URL the store handed back. A URL that is not one of ours is refused, so the
// page cannot be pointed at an arbitrary address.
export async function placeRemoteImages<T extends { path: string }>(
  content: string,
  images: T[],
  upload: (image: T) => Promise<string>,
): Promise<{ content: string, urls: string[] }> {
  const pending = referencedImages(content, images)
  const uploaded: { path: string, url: string }[] = []
  for (const image of pending) {
    const url = await upload(image)
    if (!isRemoteAsset(url))
      throw new Error('图片上传返回了无法使用的链接。')
    uploaded.push({ path: image.path, url })
  }

  const next = citeUploaded(content, uploaded)
  if (uploaded.some(image => !next.includes(image.url)))
    throw new Error('图片上传成功，但链接没有写进正文。')

  return { content: next, urls: uploaded.map(image => image.url) }
}
