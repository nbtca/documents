import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Indexes every content page by URL path, title and first paragraph, for hover previews.
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

function cleanInline(s: string): string {
  return s
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n).trimEnd()}…` : s
}

function stripFrontmatter(src: string): string {
  if (!src.startsWith('---'))
    return src
  const end = src.indexOf('\n---', 3)
  if (end === -1)
    return src
  const after = src.indexOf('\n', end + 1)
  return after === -1 ? '' : src.slice(after + 1)
}

function extractTitle(src: string): string | undefined {
  const m = stripFrontmatter(src).match(/^#[ \t]+(\S.*)$/m)
  return m ? cleanInline(m[1]) : undefined
}

// First prose paragraph, skipping headings, `:::` blocks, fenced code, tables, lists and quotes.
function extractSummary(src: string): string {
  const lines = stripFrontmatter(src).split(/\r?\n/)
  let inContainer = false
  let inFence = false
  let current: string[] = []
  let paragraph = ''

  for (const raw of lines) {
    const line = raw.trim()
    if (line.startsWith('```') || line.startsWith('~~~')) {
      inFence = !inFence
      continue
    }
    if (inFence)
      continue
    if (line.startsWith(':::')) {
      inContainer = !inContainer
      continue
    }
    if (inContainer)
      continue
    if (line === '') {
      if (current.length) {
        paragraph = current.join(' ')
        break
      }
      continue
    }
    if (/^(?:[#>|]|[-*+]\s|\d+\.\s)/.test(line)) {
      current = []
      continue
    }
    current.push(line)
  }
  if (!paragraph && current.length)
    paragraph = current.join(' ')

  return truncate(cleanInline(paragraph), 140)
}

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
      const title = extractTitle(src)
      if (!title)
        return null
      return { path: toUrlPath(file), title, summary: extractSummary(src) }
    })
    .filter((x): x is PagePreview => x !== null)
}

export default {
  watch: contentDirs.map(dir => path.join(rootDir, dir, '**/*.md')),
  load(): PagePreview[] {
    return loadPages()
  },
}
