import { isWebp } from '../../../utils/remote-asset'

const MAX_EDGE = 1600
const QUALITY = 0.85

export interface PreparedImage {
  name: string
  base64: string
  bytes: number
  url: string
}

export function slugFor(filename: string): string {
  const stem = filename.replace(/\.[^.]+$/, '').toLowerCase()
  const slug = stem.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  return `${slug || 'image'}-${Date.now().toString(36)}.webp`
}

function load(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('这个文件不是浏览器能打开的图片'))
    }
    image.src = url
  })
}

// PNG, JPEG and a still GIF all become one WebP. Animation is not kept.
export async function toWebp(file: File): Promise<PreparedImage> {
  const image = await load(file)
  const scale = Math.min(1, MAX_EDGE / Math.max(image.naturalWidth, image.naturalHeight))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(image.naturalWidth * scale)
  canvas.height = Math.round(image.naturalHeight * scale)
  const context = canvas.getContext('2d')
  if (!context)
    throw new Error('浏览器无法处理这张图片')
  context.drawImage(image, 0, 0, canvas.width, canvas.height)

  let blob = await new Promise<Blob | null>(resolve =>
    canvas.toBlob(resolve, 'image/webp', QUALITY),
  )
  if (!blob)
    throw new Error('转换 WebP 失败')

  let bytes = new Uint8Array(await blob.arrayBuffer())
  // Unsupported canvas formats silently fall back to PNG (notably in Safari).
  // Use the bundled encoder only in that case, so every uploaded .webp is WebP.
  if (!isWebp(bytes)) {
    const { default: encode } = await import('@jsquash/webp/encode')
    bytes = new Uint8Array(await encode(context.getImageData(0, 0, canvas.width, canvas.height), { quality: QUALITY * 100 }))
    if (!isWebp(bytes))
      throw new Error('转换 WebP 失败')
    blob = new Blob([bytes], { type: 'image/webp' })
  }

  let binary = ''
  for (const byte of bytes)
    binary += String.fromCharCode(byte)

  return {
    name: slugFor(file.name),
    base64: btoa(binary),
    bytes: blob.size,
    url: URL.createObjectURL(blob),
  }
}
