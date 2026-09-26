import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

export function blobSha(bytes: Uint8Array): string {
  return createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex')
}

// Same shape as GitHub's recursive tree response, so @nbtca/docs reads both with one parser.
export async function publishSources(srcDir: string, outDir: string, pages: string[]): Promise<void> {
  const root = path.join(outDir, 'docs-api')
  const files = await Promise.all([...pages].sort().map(async (page) => {
    const bytes = await readFile(path.join(srcDir, page))
    const target = path.join(root, 'raw', page)
    await mkdir(path.dirname(target), { recursive: true })
    await writeFile(target, bytes)
    return { path: page, sha: blobSha(bytes), content: bytes.toString('utf8') }
  }))
  const tree = files.map(file => ({ path: file.path, type: 'blob', sha: file.sha }))
  await writeFile(path.join(root, 'index.json'), JSON.stringify({ tree, truncated: false }))
  await writeFile(path.join(root, 'bundle.json'), JSON.stringify({ files }))
}
