import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  assetExists,
  expandAssetRegistry,
  groupEntriesByContentHash,
  listTargetBinaryAssets,
  loadAssetRegistry,
} from './asset-registry'

const repoRoot = path.resolve(__dirname, '..')
const registry = loadAssetRegistry(repoRoot)
const entries = expandAssetRegistry(registry)

describe('asset registry', () => {
  it('points every registered asset at an existing file', () => {
    const missingAssets = entries
      .filter(entry => !assetExists(entry.path, repoRoot))
      .map(entry => entry.path)

    expect(missingAssets).toEqual([])
  })

  it('registers every target binary asset in the repository', () => {
    const actualAssets = new Set(listTargetBinaryAssets(repoRoot))
    const registeredAssets = new Set(entries.map(entry => entry.path))

    const unregisteredAssets = [...actualAssets].filter(asset => !registeredAssets.has(asset))
    const staleRegistryAssets = [...registeredAssets].filter(asset => !actualAssets.has(asset))

    expect(unregisteredAssets).toEqual([])
    expect(staleRegistryAssets).toEqual([])
  })

  it('keeps asset paths and canonical paths unambiguous', () => {
    const registeredPaths = entries.map(entry => entry.path)
    const canonicalPaths = entries.filter(entry => entry.canonical).map(entry => entry.path)

    expect(new Set(registeredPaths).size).toBe(registeredPaths.length)
    expect(new Set(canonicalPaths).size).toBe(canonicalPaths.length)

    for (const entry of entries.filter(entry => !entry.canonical)) {
      expect(entry.canonicalPath).toBeTruthy()
      expect(canonicalPaths).toContain(entry.canonicalPath)
    }
  })

  it('requires duplicate hashes to have one canonical asset and explicit compatibility notes', () => {
    const duplicateGroups = [...groupEntriesByContentHash(entries, repoRoot).values()]
      .filter(group => group.length > 1)

    for (const group of duplicateGroups) {
      const canonicalEntries = group.filter(entry => entry.canonical)

      expect(canonicalEntries).toHaveLength(1)

      for (const entry of group) {
        expect(entry.compatibilityNote.trim()).not.toBe('')

        if (!entry.canonical)
          expect(entry.canonicalPath).toBe(canonicalEntries[0].path)
      }
    }
  })
})
