import { describe, expect, it, vi } from 'vitest'
import {
  assetKey,
  citeUploaded,
  isRemoteAsset,
  isWebp,
  keyFromMediaPath,
  mediaUrl,
  placeRemoteImages,
  referencedImages,
} from './remote-asset'

const ID = '00000000-0000-4000-8000-000000000000'
const KEY = `2026/09/${ID}.webp`
const URL = `/media/${KEY}`

function webp(extra = 0): Uint8Array {
  const bytes = new Uint8Array(12 + extra)
  bytes.set([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50])
  return bytes
}

describe('object keys', () => {
  it('builds a dated key and the site path that serves it', () => {
    const key = assetKey(new Date('2026-09-24T12:00:00Z'), ID)
    expect(key).toBe(KEY)
    expect(mediaUrl(key)).toBe(URL)
    expect(isRemoteAsset(URL)).toBe(true)
  })

  it('accepts the key from either a joined string or path segments', () => {
    expect(keyFromMediaPath(KEY)).toBe(KEY)
    expect(keyFromMediaPath(['2026', '09', `${ID}.webp`])).toBe(KEY)
  })

  it('refuses a path that is not an object this site would have written', () => {
    expect(keyFromMediaPath(['..', '..', 'package.json'])).toBeUndefined()
    expect(keyFromMediaPath('2026/09/not-a-uuid.webp')).toBeUndefined()
    expect(keyFromMediaPath(undefined)).toBeUndefined()
    expect(isRemoteAsset('https://example.com/media/x.webp')).toBe(false)
    expect(isRemoteAsset(`/media/${KEY}/../2026/09/${ID}.webp`)).toBe(false)
  })
})

describe('webp bytes', () => {
  it('recognises a RIFF WebP header and rejects everything else', () => {
    expect(isWebp(webp())).toBe(true)
    expect(isWebp(webp(4))).toBe(true)
    const png = webp()
    png.set([0x89, 0x50, 0x4E, 0x47], 0)
    expect(isWebp(png)).toBe(false)
    expect(isWebp(new Uint8Array([0x52, 0x49, 0x46, 0x46]))).toBe(false)
  })
})

describe('citations', () => {
  const shot = { path: 'about/assets/shot.webp', base64: 'aaa' }
  const longer = { path: 'about/assets/my-shot.webp', base64: 'bbb' }
  const page = `# 标题\n\n<Figure src="/${shot.path}" alt="现场" />\n`

  it('notices an image only while the draft still quotes its path', () => {
    expect(referencedImages(page, [shot, longer])).toEqual([shot])
    expect(referencedImages(`<Figure src="/${longer.path}" alt="现场" />`, [shot, longer])).toEqual([longer])
    expect(referencedImages('# 没有图', [shot])).toEqual([])
  })

  it('swaps the quoted path for the uploaded url and leaves a longer name alone', () => {
    const mixed = `<Figure src="/${longer.path}" alt="长" />\n<Figure src="/${shot.path}" alt="短" />`
    const next = citeUploaded(mixed, [
      { path: shot.path, url: URL },
      { path: longer.path, url: '/media/2026/09/11111111-1111-4111-8111-111111111111.webp' },
    ])

    expect(next).toContain(`src="${URL}"`)
    expect(next).toContain('src="/media/2026/09/11111111-1111-4111-8111-111111111111.webp"')
    expect(next).not.toContain(shot.path)
  })

  it('does not write a url that is not one of ours', () => {
    expect(citeUploaded(page, [{ path: shot.path, url: 'https://evil.example/a.webp' }])).toBe(page)
  })
})

describe('placing uploads', () => {
  const shot = { path: 'about/assets/shot.webp', base64: 'aaa' }
  const dropped = { path: 'about/assets/dropped.webp', base64: 'bbb' }
  const page = `<Figure src="/${shot.path}" alt="现场" />`

  it('uploads only the images the draft still cites', async () => {
    const upload = vi.fn(async () => URL)
    const placed = await placeRemoteImages(page, [shot, dropped], upload)

    expect(upload).toHaveBeenCalledTimes(1)
    expect(upload).toHaveBeenCalledWith(shot)
    expect(placed.content).toBe(`<Figure src="${URL}" alt="现场" />`)
    expect(placed.urls).toEqual([URL])
  })

  it('refuses a url the store was not supposed to return', async () => {
    await expect(placeRemoteImages(page, [shot], async () => 'https://evil.example/a.webp'))
      .rejects
      .toThrow('无法使用的链接')
  })
})
