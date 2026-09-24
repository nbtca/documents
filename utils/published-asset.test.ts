import { describe, expect, it } from 'vitest'
import { citePublishedAssets, previewSources, publishedAssetMap } from './published-asset'

const MEETING = '/assets/meeting.EL3FDEPl.webp'
const ASSEMBLY = '/assets/general-assembly.GE8dDbIH.webp'

describe('published asset urls', () => {
  const published = publishedAssetMap([
    MEETING,
    ASSEMBLY,
    '/about/assets/plain.webp',
    'https://docs.nbtca.space/assets/community.CXcBfQZ0.webp?x=1',
  ])

  it('keeps the filename the markdown uses, and ignores a path vite did not hash', () => {
    expect(published.get('meeting.webp')).toBe(MEETING)
    expect(published.get('general-assembly.webp')).toBe(ASSEMBLY)
    expect(published.get('community.webp')).toBe('https://docs.nbtca.space/assets/community.CXcBfQZ0.webp?x=1')
    expect(published.has('plain.webp')).toBe(false)
  })

  it('rewrites source paths to the hashed url and leaves a longer filename alone', () => {
    const html = [
      '<LinkCard src="./assets/meeting.webp" />',
      '<Figure src="/about/assets/general-assembly.webp" />',
      '<Figure src="./assets/my-meeting.webp" />',
    ].join('\n')

    const next = citePublishedAssets(html, published)

    expect(next).toContain(`src="${MEETING}"`)
    expect(next).toContain(`src="${ASSEMBLY}"`)
    expect(next).toContain('src="./assets/my-meeting.webp"')
  })

  it('applies a picture added in this session after the published urls', () => {
    const html = '<Figure src="/about/assets/meeting.webp" /><Figure src="/about/assets/new-shot.webp" />'
    const next = previewSources(html, published, [
      ['/about/assets/new-shot.webp', 'blob:new'],
    ])

    expect(next).toContain(`src="${MEETING}"`)
    expect(next).toContain('src="blob:new"')
  })
})
