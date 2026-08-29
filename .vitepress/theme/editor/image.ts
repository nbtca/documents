const MAX_EDGE = 1600
const QUALITY = 0.85

export interface PreparedImage {
  name: string
  base64: string
  bytes: number
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

export async function toWebp(file: File): Promise<PreparedImage> {
  const image = await load(file)
  const scale = Math.min(1, MAX_EDGE / Math.max(image.naturalWidth, image.naturalHeight))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(image.naturalWidth * scale)
  canvas.height = Math.round(image.naturalHeight * scale)
  canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height)

  const blob = await new Promise<Blob | null>(resolve =>
    canvas.toBlob(resolve, 'image/webp', QUALITY),
  )
  if (!blob)
    throw new Error('转换 WebP 失败')

  const bytes = new Uint8Array(await blob.arrayBuffer())
  let binary = ''
  for (const byte of bytes)
    binary += String.fromCharCode(byte)

  return { name: slugFor(file.name), base64: btoa(binary), bytes: blob.size }
}
