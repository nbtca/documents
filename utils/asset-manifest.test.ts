import type { Manifest } from './asset-manifest'
import { describe, expect, it } from 'vitest'
import { addAsset } from './asset-manifest'

const manifest: Manifest = {
  version: 1,
  collections: [
    {
      id: 'tutorial-documentation-images',
      domain: 'tutorial',
      purpose: 'Screenshots.',
      canonical: true,
      compatibilityNote: 'None.',
      assets: ['tutorial/assets/Approve.webp', 'tutorial/assets/Merge.webp'],
    },
  ],
}

describe('asset manifest', () => {
  it('files an image into the collection that already holds its directory', () => {
    const next = addAsset(manifest, 'tutorial/assets/new-shot.webp')
    expect(next.collections).toHaveLength(1)
    expect(next.collections[0].assets).toEqual([
      'tutorial/assets/Approve.webp',
      'tutorial/assets/Merge.webp',
      'tutorial/assets/new-shot.webp',
    ])
  })

  it('opens a collection when no existing one covers the directory', () => {
    const next = addAsset(manifest, 'process/assets/form.webp')
    expect(next.collections.map(c => c.id)).toEqual([
      'tutorial-documentation-images',
      'process-documentation-images',
    ])
  })

  it('never registers the same path twice', () => {
    const once = addAsset(manifest, 'tutorial/assets/new-shot.webp')
    expect(addAsset(once, 'tutorial/assets/new-shot.webp')).toEqual(once)
  })

  it('leaves the manifest it was given alone', () => {
    addAsset(manifest, 'tutorial/assets/new-shot.webp')
    expect(manifest.collections[0].assets).toHaveLength(2)
  })
})
