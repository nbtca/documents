export interface ManifestCollection {
  id: string
  domain: string
  purpose: string
  canonical: boolean
  compatibilityNote: string
  legacyRoot?: string
  canonicalRoot?: string
  assets: Array<string | { path: string }>
}

export interface Manifest {
  version: number
  collections: ManifestCollection[]
}

function directoryOf(path: string): string {
  return path.slice(0, path.lastIndexOf('/') + 1)
}

function pathOf(asset: string | { path: string }): string {
  return typeof asset === 'string' ? asset : asset.path
}

export function addAsset(manifest: Manifest, assetPath: string): Manifest {
  const collections = manifest.collections.map(c => ({ ...c, assets: [...c.assets] }))

  if (collections.some(c => c.assets.some(a => pathOf(a) === assetPath)))
    return { ...manifest, collections }

  const directory = directoryOf(assetPath)
  const home = collections.find(c => c.assets.some(a => directoryOf(pathOf(a)) === directory))

  if (home) {
    home.assets.push(assetPath)
    home.assets.sort((a, b) => pathOf(a).localeCompare(pathOf(b)))
    return { ...manifest, collections }
  }

  const domain = assetPath.split('/')[0]
  collections.push({
    id: `${domain}-documentation-images`,
    domain,
    purpose: `Images embedded in ${domain} pages.`,
    canonical: true,
    compatibilityNote: 'None.',
    assets: [assetPath],
  })

  return { ...manifest, collections }
}
