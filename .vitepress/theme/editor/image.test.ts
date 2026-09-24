import { afterEach, describe, expect, it, vi } from 'vitest'
import { toWebp } from './image'

const { encode } = vi.hoisted(() => ({ encode: vi.fn() }))
vi.mock('@jsquash/webp/encode', () => ({ default: encode }))

const WEBP = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50])

function canvasReturning(blob: Blob) {
  const imageData = { data: new Uint8ClampedArray(8), width: 2, height: 1 } as ImageData
  const context = { drawImage: vi.fn(), getImageData: vi.fn(() => imageData) }
  const canvas = {
    width: 0,
    height: 0,
    getContext: vi.fn(() => context),
    toBlob: vi.fn((callback: BlobCallback) => callback(blob)),
  }
  vi.stubGlobal('document', { createElement: vi.fn(() => canvas) })
  vi.stubGlobal('Image', class {
    naturalWidth = 2
    naturalHeight = 1
    onload?: () => void
    get src() {
      return ''
    }

    set src(_value: string) {
      this.onload?.()
    }
  })
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:preview')
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  return { canvas, context, imageData }
}

describe('image conversion', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    encode.mockReset()
  })

  it('keeps a WebP produced by the browser', async () => {
    canvasReturning(new Blob([WEBP], { type: 'image/webp' }))

    const result = await toWebp(new File(['source'], 'shot.png'))

    expect(result.base64).toBe(btoa(String.fromCharCode(...WEBP)))
    expect(result.bytes).toBe(WEBP.byteLength)
    expect(encode).not.toHaveBeenCalled()
  })

  it('encodes the PNG a browser may return for an unsupported WebP request', async () => {
    const { canvas, context, imageData } = canvasReturning(new Blob(['png'], { type: 'image/png' }))
    encode.mockResolvedValue(WEBP.buffer)

    const result = await toWebp(new File(['source'], 'shot.png'))

    expect(canvas.toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/webp', 0.85)
    expect(context.getImageData).toHaveBeenCalledWith(0, 0, 2, 1)
    expect(encode).toHaveBeenCalledWith(imageData, { quality: 85 })
    expect(result.base64).toBe(btoa(String.fromCharCode(...WEBP)))
    expect(result.bytes).toBe(WEBP.byteLength)
  })
})
