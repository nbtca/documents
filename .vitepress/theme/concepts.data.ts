import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { extractTitle } from '../../utils/content-contract'
import { extractSummary, frontmatterValue } from '../../utils/page-preview'

export interface PagePreview {
  path: string
  title: string
  summary: string
}

declare const data: PagePreview[]
export { data }

const rootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
)
const contentDirs = ['about', 'process', 'repair', 'tutorial', 'concepts', 'archived']

function walk(dir: string): string[] {
  let entries: fs.Dirent[]
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  }
  catch {
    return []
  }
  const out: string[] = []
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory())
      out.push(...walk(full))
    else if (entry.name.endsWith('.md'))
      out.push(full)
  }
  return out
}

function toUrlPath(file: string): string {
  const rel = path.relative(rootDir, file).replace(/\\/g, '/').replace(/\.md$/, '')
  if (rel === 'index')
    return '/'
  if (rel.endsWith('/index'))
    return `/${rel.slice(0, -'index'.length)}`
  return `/${rel}`
}

function loadPages(): PagePreview[] {
  return contentDirs
    .flatMap(dir => walk(path.join(rootDir, dir)))
    .map((file) => {
      const src = fs.readFileSync(file, 'utf-8')
      // Headingless archived files fall back to the filename in the sidebar; match it.
      const title = extractTitle(src) ?? path.basename(file, '.md')
      const summary = frontmatterValue(src, 'summary') ?? extractSummary(src)
      return { path: toUrlPath(file), title, summary }
    })
}

export default {
  watch: contentDirs.map(dir => path.join(rootDir, dir, '**/*.md')),
  load(): PagePreview[] {
    return loadPages()
  },
}
