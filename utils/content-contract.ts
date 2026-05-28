import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'

export const ACTIVE_DOC_DIRS = ['tutorial', 'process', 'repair'] as const
export const ARCHIVED_DOC_DIR = 'archived'

export type ActiveDocDomain = typeof ACTIVE_DOC_DIRS[number]
export type DocCategory = 'active' | 'archived'

export interface DocFile {
  absolutePath: string
  category: DocCategory
  content: string
  domain: string
  h1: string | undefined
  relativePath: string
  routePath: string
}

export interface MarkdownLink {
  line: number
  rawTarget: string
  sourceRelativePath: string
  target: string
}

export interface LinkResolution {
  link: MarkdownLink
  reason?: string
  resolvedPath?: string
  status: 'ok' | 'skipped' | 'broken'
}

export interface DuplicateRoute {
  routePath: string
  files: string[]
}

const DEFAULT_ROOT = path.resolve(__dirname, '..')
export function toPosixPath(filepath: string): string {
  return filepath.split(path.sep).join(path.posix.sep)
}

export function routePathFromRelativePath(relativePath: string): string {
  return `/${toPosixPath(relativePath).replace(/\.md$/, '')}`
}

export function extractH1(content: string): string | undefined {
  let inFence = false

  for (const line of content.split(/\r?\n/)) {
    const trimmedStart = line.trimStart()
    if (isFenceMarker(trimmedStart)) {
      inFence = !inFence
      continue
    }

    if (inFence)
      continue

    if (line.startsWith('# ')) {
      const heading = stripClosingHeadingMarkers(line.slice(2).trim())
      if (heading)
        return heading
    }
  }
}

export function listDocs(root = DEFAULT_ROOT): DocFile[] {
  const docs: DocFile[] = []

  for (const domain of ACTIVE_DOC_DIRS)
    docs.push(...listDocsInDomain(root, domain, 'active'))

  docs.push(...listDocsInDomain(root, ARCHIVED_DOC_DIR, 'archived'))

  return docs.sort((a, b) => a.relativePath.localeCompare(b.relativePath))
}

export function listActiveDocs(root = DEFAULT_ROOT): DocFile[] {
  return listDocs(root).filter(doc => doc.category === 'active')
}

export function listArchivedDocs(root = DEFAULT_ROOT): DocFile[] {
  return listDocs(root).filter(doc => doc.category === 'archived')
}

export function findDuplicateRoutePaths(docs: DocFile[]): DuplicateRoute[] {
  const byRoute = new Map<string, string[]>()

  for (const doc of docs) {
    const files = byRoute.get(doc.routePath) ?? []
    files.push(doc.relativePath)
    byRoute.set(doc.routePath, files)
  }

  return [...byRoute.entries()]
    .filter(([, files]) => files.length > 1)
    .map(([routePath, files]) => ({ routePath, files }))
}

export function extractMarkdownLinks(content: string, sourceRelativePath: string): MarkdownLink[] {
  const links: MarkdownLink[] = []
  const lines = content.split(/\r?\n/)
  let inFence = false

  for (const [index, line] of lines.entries()) {
    const trimmedStart = line.trimStart()
    if (isFenceMarker(trimmedStart)) {
      inFence = !inFence
      continue
    }

    if (inFence)
      continue

    let searchFrom = 0
    while (searchFrom < line.length) {
      const targetStart = line.indexOf('](', searchFrom)
      if (targetStart < 0)
        break

      const targetEnd = line.indexOf(')', targetStart + 2)
      if (targetEnd < 0)
        break

      const rawTarget = line.slice(targetStart + 2, targetEnd)
      const target = cleanMarkdownTarget(rawTarget)
      links.push({
        line: index + 1,
        rawTarget,
        sourceRelativePath,
        target,
      })
      searchFrom = targetEnd + 1
    }
  }

  return links
}

function isFenceMarker(trimmedStart: string): boolean {
  return trimmedStart.startsWith('```') || trimmedStart.startsWith('~~~')
}

function stripClosingHeadingMarkers(heading: string): string {
  let end = heading.length
  while (end > 0 && heading[end - 1] === '#')
    end -= 1

  if (end < heading.length && end > 0 && /\s/.test(heading[end - 1]))
    return heading.slice(0, end).trimEnd()

  return heading
}

export function resolveInternalLink(link: MarkdownLink, root = DEFAULT_ROOT): LinkResolution {
  if (!link.target || isExternalLink(link.target) || link.target.startsWith('#')) {
    return {
      link,
      reason: 'external or same-page anchor',
      status: 'skipped',
    }
  }

  const targetPath = stripHashAndQuery(link.target)
  if (!targetPath) {
    return {
      link,
      reason: 'same-page anchor',
      status: 'skipped',
    }
  }

  const decodedTargetPath = decodeLinkPath(targetPath)
  const sourceDir = path.posix.dirname(toPosixPath(link.sourceRelativePath))
  const candidatePath = decodedTargetPath.startsWith('/')
    ? path.join(root, decodedTargetPath)
    : path.resolve(root, sourceDir, decodedTargetPath)
  const resolvedPath = resolveExistingPath(candidatePath)

  if (resolvedPath) {
    return {
      link,
      resolvedPath,
      status: 'ok',
    }
  }

  return {
    link,
    reason: `No file or VitePress page found for ${link.target}`,
    status: 'broken',
  }
}

export function collectNavigationLinks(config: unknown): string[] {
  const links = new Set<string>()

  if (!isRecord(config))
    return []

  const themeConfig = config.themeConfig
  if (!isRecord(themeConfig))
    return []

  collectEntryLinks(themeConfig.nav, '', links)
  collectEntryLinks(themeConfig.sidebar, '', links)

  return [...links].sort()
}

export function normalizeSiteRoute(link: string): string | undefined {
  if (!link || isExternalLink(link) || link.startsWith('#'))
    return undefined

  const withoutHash = stripHashAndQuery(link)
  if (!withoutHash)
    return undefined

  let route = withoutHash
  if (!route.startsWith('/'))
    route = `/${route}`

  route = route.replace(/\.md$/, '')
  if (route.endsWith('/'))
    route = `${route}index`

  return path.posix.normalize(route)
}

function listDocsInDomain(root: string, domain: string, category: DocCategory): DocFile[] {
  const domainDir = path.join(root, domain)
  return listMarkdownFiles(domainDir).map((absolutePath) => {
    const relativePath = toPosixPath(path.relative(root, absolutePath))
    const content = readFileSync(absolutePath, 'utf-8')

    return {
      absolutePath,
      category,
      content,
      domain,
      h1: extractH1(content),
      relativePath,
      routePath: routePathFromRelativePath(relativePath),
    }
  })
}

function listMarkdownFiles(dir: string): string[] {
  if (!existsSync(dir))
    return []

  const files: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.'))
      continue

    const entryPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...listMarkdownFiles(entryPath))
      continue
    }

    if (entry.isFile() && entry.name.endsWith('.md'))
      files.push(entryPath)
  }

  return files.sort()
}

function cleanMarkdownTarget(rawTarget: string): string {
  const trimmed = rawTarget.trim()
  if (!trimmed)
    return ''

  if (trimmed.startsWith('<')) {
    const closing = trimmed.indexOf('>')
    if (closing > 0)
      return trimmed.slice(1, closing)
  }

  const titleStart = trimmed.search(/\s+["'(]/)
  if (titleStart >= 0)
    return trimmed.slice(0, titleStart)

  return trimmed
}

function isExternalLink(target: string): boolean {
  return /^[a-z][a-z\d+.-]*:/i.test(target) || target.startsWith('//')
}

function stripHashAndQuery(target: string): string {
  const hashIndex = target.indexOf('#')
  const queryIndex = target.indexOf('?')
  const endIndex = [hashIndex, queryIndex]
    .filter(index => index >= 0)
    .sort((a, b) => a - b)[0]

  return endIndex === undefined ? target : target.slice(0, endIndex)
}

function decodeLinkPath(target: string): string {
  try {
    return decodeURI(target)
  }
  catch {
    return target
  }
}

function resolveExistingPath(candidatePath: string): string | undefined {
  if (existsSync(candidatePath)) {
    if (statSync(candidatePath).isDirectory())
      return existingPath(path.join(candidatePath, 'index.md'))

    return candidatePath
  }

  return existingPath(`${candidatePath}.md`)
    ?? existingPath(path.join(candidatePath, 'index.md'))
}

function existingPath(candidatePath: string): string | undefined {
  return existsSync(candidatePath) ? candidatePath : undefined
}

function collectEntryLinks(value: unknown, base: string, links: Set<string>): void {
  if (Array.isArray(value)) {
    for (const item of value)
      collectEntryLinks(item, base, links)
    return
  }

  if (!isRecord(value))
    return

  const nextBase = typeof value.base === 'string'
    ? resolveEntryLink(value.base, base)
    : base

  if (typeof value.link === 'string') {
    const route = normalizeSiteRoute(resolveEntryLink(value.link, nextBase))
    if (route)
      links.add(route)
  }

  if ('items' in value)
    collectEntryLinks(value.items, nextBase, links)

  if (!('items' in value) && !('link' in value)) {
    for (const child of Object.values(value))
      collectEntryLinks(child, nextBase, links)
  }
}

function resolveEntryLink(link: string, base: string): string {
  if (link.startsWith('/'))
    return link

  return path.posix.join(base || '/', link)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
