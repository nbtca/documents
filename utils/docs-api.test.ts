import { execFileSync } from 'node:child_process'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { blobSha, publishSources } from './docs-api'

const outDirs: string[] = []

afterEach(async () => {
  await Promise.all(outDirs.splice(0).map(dir => rm(dir, { recursive: true, force: true })))
})

describe('docs api', () => {
  it('hashes a file the way git hash-object does', async () => {
    const file = 'about/index.md'
    const expected = execFileSync('git', ['hash-object', file], { encoding: 'utf8' }).trim()
    expect(blobSha(await readFile(file))).toBe(expected)
  })

  it('publishes each source byte for byte next to a sorted index', async () => {
    const outDir = await mkdtemp(path.join(tmpdir(), 'docs-api-'))
    outDirs.push(outDir)
    await publishSources('.', outDir, ['index.md', 'about/index.md'])

    const index = JSON.parse(await readFile(path.join(outDir, 'docs-api/index.json'), 'utf8'))
    expect(index.truncated).toBe(false)
    expect(index.tree.map((item: { path: string }) => item.path)).toEqual(['about/index.md', 'index.md'])
    for (const item of index.tree) {
      const raw = await readFile(path.join(outDir, 'docs-api/raw', item.path))
      expect(raw.equals(await readFile(item.path))).toBe(true)
      expect(item).toEqual({ path: item.path, type: 'blob', sha: blobSha(raw) })
    }
  })

  it('bundles every source with the sha git would give it', async () => {
    const outDir = await mkdtemp(path.join(tmpdir(), 'docs-api-'))
    outDirs.push(outDir)
    await publishSources('.', outDir, ['index.md', 'about/index.md'])

    const bundle = JSON.parse(await readFile(path.join(outDir, 'docs-api/bundle.json'), 'utf8'))
    expect(bundle.files.map((file: { path: string }) => file.path)).toEqual(['about/index.md', 'index.md'])
    for (const file of bundle.files) {
      const expected = execFileSync('git', ['hash-object', file.path], { encoding: 'utf8' }).trim()
      expect(file).toEqual({ path: file.path, sha: expected, content: await readFile(file.path, 'utf8') })
    }
  })
})
