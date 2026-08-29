// The DOM percent-encodes paths; the preview index does not.
export function routeFromHref(href: string, origin: string): string | null {
  let url: URL
  try {
    url = new URL(href, origin)
  }
  catch {
    return null
  }

  if (url.origin !== origin)
    return null

  let path: string
  try {
    path = decodeURIComponent(url.pathname)
  }
  catch {
    path = url.pathname
  }

  path = path.replace(/\.html$/, '')
  return path.endsWith('/index') ? path.slice(0, -'index'.length) : path
}

export function stripFrontmatter(source: string): string {
  if (!source.startsWith('---'))
    return source

  const end = source.indexOf('\n---', 3)
  if (end === -1)
    return source

  const after = source.indexOf('\n', end + 1)
  return after === -1 ? '' : source.slice(after + 1)
}

export function frontmatterValue(source: string, key: string): string | undefined {
  if (!source.startsWith('---'))
    return undefined

  const end = source.indexOf('\n---', 3)
  if (end === -1)
    return undefined

  const match = source.slice(3, end).match(new RegExp(`^${key}:[ \\t]*(\\S.*)$`, 'm'))
  if (!match)
    return undefined

  const value = cleanInline(match[1].trim().replace(/^(['"])(.*)\1$/, '$2'))
  return value || undefined
}

// Removing a tag can splice a fresh one out of the text around it, and an
// unterminated "<script" never matches at all.
function stripTags(text: string): string {
  let previous: string
  let result = text
  do {
    previous = result
    result = result.replace(/<[^>]*>/g, '')
  } while (result !== previous)
  return result.replace(/[<>]/g, '')
}

export function cleanInline(text: string): string {
  return stripTags(
    text
      .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1'),
  )
    .replace(/\s+/g, ' ')
    .trim()
}

function truncate(text: string, limit: number): string {
  return text.length > limit ? `${text.slice(0, limit).trimEnd()}…` : text
}

const MARKDOWN_DIRECTIVE = /^\[\[[a-z]+\]\]$/i
const THEMATIC_BREAK = /^(?:-{3,}|\*{3,}|_{3,})$/
// Chinese numbered lists omit the space after the marker; the lookahead keeps
// decimals and dates ("2024.09") out.
const BLOCK_MARKER = /^(?:[#>|]|[-*+](?:\s|$)|\d{1,2}[.、)](?!\d))/

// A page opening with a component has no prose to quote; it sets `summary:`.
export function extractSummary(source: string, limit = 140): string {
  const lines = stripFrontmatter(source).split(/\r?\n/)
  let inContainer = false
  let inFence = false
  let inTag = false
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

    if (inTag) {
      if (line.endsWith('>'))
        inTag = false
      continue
    }
    if (line.startsWith('<')) {
      current = []
      if (!line.endsWith('>'))
        inTag = true
      continue
    }

    if (line === '') {
      if (current.length) {
        paragraph = current.join(' ')
        break
      }
      continue
    }

    if (MARKDOWN_DIRECTIVE.test(line) || THEMATIC_BREAK.test(line) || BLOCK_MARKER.test(line)) {
      current = []
      continue
    }

    current.push(line)
  }

  if (!paragraph && current.length)
    paragraph = current.join(' ')

  return truncate(cleanInline(paragraph), limit)
}
