import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, globSync, readFileSync } from 'node:fs'
import path from 'node:path'

const repoRoot = path.resolve(__dirname, '..')
const targetAssetExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp', '.doc', '.docx', '.xlsx'])
const ignoredDirectoryPaths = ['.git', 'node_modules', '.vitepress/dist', '.vitepress/cache']

export interface AssetRegistryManifest {
  version: number
  collections: AssetRegistryCollection[]
}

export interface AssetRegistryCollection {
  id: string
  domain: string
  purpose: string
  canonical: boolean
  compatibilityNote: string
  legacyRoot?: string
  canonicalRoot?: string
  assets: AssetRegistryAsset[]
}

export interface AssetRegistryObjectAsset {
  path: string
  title?: string
  canonicalPath?: string
  notes?: string
}

export type AssetRegistryAsset = string | AssetRegistryObjectAsset

export interface AssetRegistryEntry {
  collectionId: string
  path: string
  domain: string
  purpose: string
  canonical: boolean
  compatibilityNote: string
  canonicalPath?: string
  title?: string
  notes?: string
}

export function loadAssetRegistry(rootDir = repoRoot): AssetRegistryManifest {
  const registryPath = path.join(rootDir, 'checks/asset-registry.json')
  return JSON.parse(readFileSync(registryPath, 'utf8')) as AssetRegistryManifest
}

export function expandAssetRegistry(manifest = loadAssetRegistry()): AssetRegistryEntry[] {
  return manifest.collections.flatMap((collection) => {
    return collection.assets.map((asset) => {
      const assetEntry = typeof asset === 'string' ? { path: asset } : asset

      return {
        collectionId: collection.id,
        path: assetEntry.path,
        domain: collection.domain,
        purpose: collection.purpose,
        canonical: collection.canonical,
        compatibilityNote: collection.compatibilityNote,
        canonicalPath: assetEntry.canonicalPath ?? deriveCanonicalPath(collection, assetEntry.path),
        title: assetEntry.title,
        notes: assetEntry.notes,
      }
    })
  })
}

// git is the source of truth: an asset staged for deletion must stop counting.
export function listTargetBinaryAssets(rootDir = repoRoot): string[] {
  const candidates = listTrackedRepoFiles(rootDir)
    ?? globSync(`**/*{${[...targetAssetExtensions].join(',')}}`, {
      cwd: rootDir,
      exclude: repoPath => isIgnoredDirectory(repoPath),
    })

  return candidates
    .filter(repoPath => targetAssetExtensions.has(path.extname(repoPath).toLowerCase()))
    .filter(repoPath => !isIgnoredDirectory(repoPath))
    .sort((a, b) => a.localeCompare(b))
}

export function assetExists(assetPath: string, rootDir = repoRoot): boolean {
  return existsSync(path.join(rootDir, assetPath))
}

export function hashAsset(assetPath: string, rootDir = repoRoot): string {
  return createHash('sha256')
    .update(readFileSync(path.join(rootDir, assetPath)))
    .digest('hex')
}

export function groupEntriesByContentHash(entries: AssetRegistryEntry[], rootDir = repoRoot) {
  const groups = new Map<string, AssetRegistryEntry[]>()

  for (const entry of entries) {
    const hash = hashAsset(entry.path, rootDir)
    const group = groups.get(hash) ?? []
    group.push(entry)
    groups.set(hash, group)
  }

  return groups
}

function deriveCanonicalPath(collection: AssetRegistryCollection, assetPath: string): string | undefined {
  if (collection.canonical || !collection.legacyRoot || !collection.canonicalRoot)
    return undefined

  if (!assetPath.startsWith(collection.legacyRoot))
    return undefined

  return `${collection.canonicalRoot}${assetPath.slice(collection.legacyRoot.length)}`
}

function isIgnoredDirectory(repoPath: string): boolean {
  return ignoredDirectoryPaths.some((ignoredPath) => {
    return repoPath === ignoredPath || repoPath.startsWith(`${ignoredPath}/`)
  })
}

function listTrackedRepoFiles(rootDir: string): string[] | undefined {
  try {
    return execFileSync('git', ['-C', rootDir, 'ls-files', '-z'], { encoding: 'utf8' })
      .split('\0')
      .filter(Boolean)
  }
  catch {
    return undefined
  }
}
