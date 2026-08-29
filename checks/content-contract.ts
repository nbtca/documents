import { existsSync, globSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { extractH1, extractTitle, isFenceMarker } from '../utils/markdown'

export const ACTIVE_DOC_DIRS = ['about', 'tutorial', 'process'] as const

// Hub sections carry no sidebar, so they are exempt from the nav contract only.
export const HUB_DOC_DIRS = ['concepts', 'repair'] as const

export const ARCHIVED_DOC_DIR = 'archived'

export const ROUTED_DOC_DIRS = [...ACTIVE_DOC_DIRS, ...HUB_DOC_DIRS] as const

export type DocCategory = 'active' | 'hub' | 'archived'

const CATEGORY_OF_DIR = new Map<string, DocCategory>([
  ...ACTIVE_DOC_DIRS.map(dir => [dir, 'active'] as const),
  ...HUB_DOC_DIRS.map(dir => [dir, 'hub'] as const),
  [ARCHIVED_DOC_DIR, 'archived'],
])

export interface DocFile {
  absolutePath: string
  category: DocCategory
  content: string
  domain: string
  h1: string | undefined
  relativePath: string
  routePath: string
  title: string | undefined
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

export function listDocs(root = DEFAULT_ROOT, category?: DocCategory): DocFile[] {
  const dirs = [...CATEGORY_OF_DIR].filter(([, kind]) => !category || kind === category)

  return dirs
    .flatMap(([domain, kind]) =>
      globSync(`${domain}/**/*.md`, { cwd: root }).map((match) => {
        const relativePath = toPosixPath(match)
        const absolutePath = path.join(root, match)
        const content = readFileSync(absolutePath, 'utf-8')

        return {
          absolutePath,
          category: kind,
          content,
          domain,
          h1: extractH1(content),
          relativePath,
          routePath: routePathFromRelativePath(relativePath),
          title: extractTitle(content),
        }
      }),
    )
    .sort((a, b) => a.relativePath.localeCompare(b.relativePath))
}

export function listRoutedDocs(root = DEFAULT_ROOT): DocFile[] {
  return listDocs(root).filter(doc => doc.category !== 'archived')
}

export function findDuplicateRoutePaths(docs: DocFile[]): DuplicateRoute[] {
  const byRoute = new Map<string, string[]>()

  for (const doc of docs)
    byRoute.set(doc.routePath, [...(byRoute.get(doc.routePath) ?? []), doc.relativePath])

  return [...byRoute.entries()]
    .filter(([, files]) => files.length > 1)
    .map(([routePath, files]) => ({ routePath, files }))
}

export function extractMarkdownLinks(content: string, sourceRelativePath: string): MarkdownLink[] {
  const links: MarkdownLink[] = []
  let inFence = false

  for (const [index, line] of content.split(/\r?\n/).entries()) {
    if (isFenceMarker(line.trimStart())) {
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
      links.push({
        line: index + 1,
        rawTarget,
        sourceRelativePath,
        target: cleanMarkdownTarget(rawTarget),
      })
      searchFrom = targetEnd + 1
    }
  }

  return links
}

export function resolveInternalLink(link: MarkdownLink, root = DEFAULT_ROOT): LinkResolution {
  if (!link.target || isExternalLink(link.target) || link.target.startsWith('#'))
    return { link, reason: 'external or same-page anchor', status: 'skipped' }

  const targetPath = stripHashAndQuery(link.target)
  if (!targetPath)
    return { link, reason: 'same-page anchor', status: 'skipped' }

  const decodedTargetPath = decodeLinkPath(targetPath)
  const sourceDir = path.posix.dirname(toPosixPath(link.sourceRelativePath))
  // VitePress serves public/ from the site root, so /templates/x.doc on a page
  // is public/templates/x.doc on disk.
  const candidatePaths = decodedTargetPath.startsWith('/')
    ? [path.join(root, decodedTargetPath), path.join(root, 'public', decodedTargetPath)]
    : [path.resolve(root, sourceDir, decodedTargetPath)]

  for (const candidatePath of candidatePaths) {
    const resolvedPath = resolveExistingPath(candidatePath)
    if (resolvedPath)
      return { link, resolvedPath, status: 'ok' }
  }

  return { link, reason: `No file or VitePress page found for ${link.target}`, status: 'broken' }
}

export function collectNavigationLinks(config: unknown): string[] {
  const links = new Set<string>()

  if (!isRecord(config) || !isRecord(config.themeConfig))
    return []

  collectEntryLinks(config.themeConfig.nav, '', links)
  collectEntryLinks(config.themeConfig.sidebar, '', links)

  return [...links].sort()
}

export function normalizeSiteRoute(link: string): string | undefined {
  if (!link || isExternalLink(link) || link.startsWith('#'))
    return undefined

  const withoutHash = stripHashAndQuery(link)
  if (!withoutHash)
    return undefined

  let route = withoutHash.startsWith('/') ? withoutHash : `/${withoutHash}`
  route = route.replace(/\.md$/, '')
  if (route.endsWith('/'))
    route = `${route}index`

  return path.posix.normalize(route)
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
  return titleStart >= 0 ? trimmed.slice(0, titleStart) : trimmed
}

function isExternalLink(target: string): boolean {
  return /^[a-z][a-z\d+.-]*:/i.test(target) || target.startsWith('//')
}

function stripHashAndQuery(target: string): string {
  const end = [target.indexOf('#'), target.indexOf('?')]
    .filter(index => index >= 0)
    .sort((a, b) => a - b)[0]

  return end === undefined ? target : target.slice(0, end)
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
    return statSync(candidatePath).isDirectory()
      ? existingPath(path.join(candidatePath, 'index.md'))
      : candidatePath
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

  const nextBase = typeof value.base === 'string' ? resolveEntryLink(value.base, base) : base

  if (typeof value.link === 'string') {
    const route = normalizeSiteRoute(resolveEntryLink(value.link, nextBase))
    if (route)
      links.add(route)
  }

  if ('items' in value) {
    collectEntryLinks(value.items, nextBase, links)
    return
  }

  if (!('link' in value)) {
    for (const child of Object.values(value))
      collectEntryLinks(child, nextBase, links)
  }
}

function resolveEntryLink(link: string, base: string): string {
  return link.startsWith('/') ? link : path.posix.join(base || '/', link)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
