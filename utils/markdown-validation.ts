import type { Configuration, FixInfo, LintError } from 'markdownlint'
import { AUTO_FIXED, MARKDOWNLINT_CONFIG, RULE_FIXES, RULE_MESSAGES, ruleGuide } from './markdown-rules'

export { MARKDOWNLINT_CONFIG }

// The nearest config above a page wins. archived/.markdownlint.jsonc adds
// these overrides because scanned records keep their original structure.
const ARCHIVED_CONFIG = {
  ...MARKDOWNLINT_CONFIG,
  MD001: false,
  MD004: false,
  MD022: false,
  MD024: false,
  MD025: false,
  MD028: false,
  MD029: false,
  MD051: false,
} satisfies Configuration

export interface MarkdownValidationOptions {
  archived?: boolean
  mermaid?: boolean
  // Routes that exist on the site, such as /repair/ or /about/join.
  pages?: readonly string[]
}

function fencedLines(fences: Fence[]): Set<number> {
  const fenced = new Set<number>()
  for (const fence of fences) {
    for (let line = fence.line; line <= fence.line + fence.content.length + (fence.closed ? 1 : 0); line++)
      fenced.add(line)
  }
  return fenced
}

const LINK = /\]\((\/[^\s)#?]*)/g
// MD045 catches an empty description; a camera filename passes it and still
// tells a screen reader nothing.
const FILENAME_ALT = /!\[([^\]]*)\]\(|\balt="([^"]*)"/g
const LOOKS_LIKE_FILE = /^(?:(?:IMG|DSC|PXL|VID|Screenshot|截屏|屏幕截图|微信图片)[\w\s\-.()]*|[\w-]+\.(?:png|jpe?g|webp|gif|heic))$/i

function inspectAlt(source: string, fences: Fence[]): MarkdownIssue[] {
  const fenced = fencedLines(fences)
  return source.split('\n').flatMap((text, index) => fenced.has(index + 1)
    ? []
    : [...text.matchAll(FILENAME_ALT)].flatMap((match) => {
        const alt = (match[1] ?? match[2]).trim()
        return alt && LOOKS_LIKE_FILE.test(alt) ? [issue(index + 1, match.index + 1, 'ALT', alt)] : []
      }))
}

// markdownlint has no idea which pages exist, so a mistyped site path only
// shows up after review as a 404. Same normalising as the build's router:
// trailing slash, .md and .html all point at one page.
function inspectLinks(source: string, fences: Fence[], pages: readonly string[]): MarkdownIssue[] {
  const known = new Set(pages.map(route => route.replace(/\/$/, '') || '/'))
  const fenced = fencedLines(fences)
  return source.split('\n').flatMap((text, index) => {
    if (fenced.has(index + 1))
      return []
    return [...text.replace(/`[^`]*`/g, match => ' '.repeat(match.length)).matchAll(LINK)].flatMap((match) => {
      const route = decodeURI(match[1]).replace(/(?:\/index)?(?:\.md|\.html)?\/?$/, '') || '/'
      if (known.has(route) || /\.\w+$/.test(route))
        return []
      return [issue(index + 1, match.index + 3, 'LINK', match[1])]
    })
  })
}

export interface MarkdownIssue {
  line: number
  column: number
  rule: string
  message: string
  fix?: string
  detail?: string
  fixInfo?: FixInfo
  information?: string
}

interface Fence {
  char: '`' | '~'
  length: number
  line: number
  info: string
  content: string[]
  closed: boolean
}

interface MermaidBlock {
  line: number
  content: string
}

interface Marker {
  char: '`' | '~' | ':'
  length: number
  info: string
}

function marker(text: string, chars: ReadonlyArray<Marker['char']>): Marker | undefined {
  const indent = text.match(/^ {0,3}/)?.[0].length ?? 0
  const body = text.slice(indent)
  const char = body[0]
  if (!char || !chars.includes(char as Marker['char']))
    return undefined

  let length = 0
  while (body[length] === char)
    length++
  if (length < 3)
    return undefined
  return { char: char as Marker['char'], length, info: body.slice(length).trim() }
}

function issue(line: number, column: number, rule: string, detail?: string): MarkdownIssue {
  const value: MarkdownIssue = {
    line: Math.max(1, line),
    column: Math.max(1, column),
    rule,
    message: RULE_MESSAGES[rule] ?? rule,
  }
  if (RULE_FIXES[rule]) {
    value.fix = RULE_FIXES[rule]
    value.information = ruleGuide(rule)
  }
  if (detail?.trim())
    value.detail = detail.trim()
  return value
}

function inspectFences(source: string): { blocks: Fence[], issues: MarkdownIssue[] } {
  const lines = source.split('\n')
  const blocks: Fence[] = []
  const issues: MarkdownIssue[] = []
  let open: Fence | undefined

  for (let index = 0; index < lines.length; index++) {
    const text = lines[index]
    if (!open) {
      const match = marker(text, ['`', '~'])
      if (!match || (match.char === '`' && match.info.includes('`')))
        continue
      open = {
        char: match.char,
        length: match.length,
        line: index + 1,
        info: match.info,
        content: [],
        closed: false,
      }
      continue
    }

    const close = marker(text, [open.char])
    if (close && !close.info && close.length >= open.length) {
      blocks.push({ ...open, closed: true })
      open = undefined
    }
    else {
      open.content.push(text)
    }
  }

  if (open) {
    blocks.push(open)
    issues.push(issue(open.line, 1, 'FENCE', `请补上 ${open.char.repeat(open.length)} 结束标记`))
  }

  return { blocks, issues }
}

function inspectContainers(source: string, fences: Fence[]): MarkdownIssue[] {
  const fenced = fencedLines(fences)

  const issues: MarkdownIssue[] = []
  const open: Array<{ length: number, line: number }> = []

  source.split('\n').forEach((text, index) => {
    const line = index + 1
    if (fenced.has(line))
      return
    const match = marker(text, [':'])
    if (!match)
      return
    if (match.info) {
      open.push({ length: match.length, line })
      return
    }

    let found = -1
    for (let at = open.length - 1; at >= 0; at--) {
      if (open[at].length <= match.length) {
        found = at
        break
      }
    }
    if (found === -1)
      issues.push(issue(line, 1, 'CONTAINER', '这一行 ::: 没有对应开头'))
    else
      open.splice(found, 1)
  })

  for (const entry of open)
    issues.push(issue(entry.line, 1, 'CONTAINER', '请补上 ::: 结束标记'))

  return issues
}

const STYLE_NAMES: Record<string, string> = {
  asterisk: '*',
  underscore: '_',
  dash: '-',
  plus: '+',
  backtick: '```',
  tilde: '~~~',
  fenced: '围栏代码块',
  indented: '缩进代码块',
  atx: '# 标题',
  setext: '下划线标题',
  leading_and_trailing: '首尾都有 |',
  no_leading_or_trailing: '首尾都没有 |',
  leading_only: '只有开头有 |',
  trailing_only: '只有结尾有 |',
}

const COUNTED: Record<string, string> = {
  MD007: '缩进应该是 {want} 个空格，现在是 {got} 个',
  MD030: '应该是 {want} 个空格，现在是 {got} 个',
}

// Only the formats markdownlint 0.38 actually emits; anything else stays as is.
function translateDetail(rule: string, detail: string): string {
  const expected = detail.match(/^Expected: ([^;]+); Actual: ([^;]+)(?:; (.*))?$/)
  if (expected) {
    const [, want, got, rest = ''] = expected
    const name = (value: string) => STYLE_NAMES[value] ?? value
    if (rule === 'MD022')
      return `${rest === 'Above' ? '上方' : '下方'}需要 ${want} 个空行，现在是 ${got} 个`
    if (rule === 'MD056')
      return `表头有 ${want} 列，这一行有 ${got} 列`
    if (rule === 'MD029')
      return `这里应该编号为 ${want}，现在是 ${got}`
    if (COUNTED[rule])
      return COUNTED[rule].replace('{want}', want).replace('{got}', got)
    return `应该写成 ${name(want)}，现在是 ${name(got)}`
  }
  const definition = detail.match(/^(Missing|Unused) link or image reference definition: "(.*)"$/)
  if (definition)
    return definition[1] === 'Missing' ? `找不到名为 “${definition[2]}” 的定义` : `“${definition[2]}” 的定义没有被引用`
  const punctuation = detail.match(/^Punctuation: '(.*)'$/)
  if (punctuation)
    return `删掉末尾的 “${punctuation[1]}”`
  const column = detail.match(/^Column: (\d+)$/)
  if (column)
    return `第 ${column[1]} 个字符是 Tab`
  return detail
}

function markdownlintIssue(error: LintError): MarkdownIssue {
  const rule = error.ruleNames[0] ?? 'MARKDOWNLINT'
  const column = error.errorRange?.[0] ?? 1
  const value = issue(
    error.lineNumber,
    column,
    rule,
    error.errorDetail ? translateDetail(rule, error.errorDetail) : error.errorContext || undefined,
  )
  if (error.fixInfo)
    value.fixInfo = error.fixInfo
  return value
}

export async function fixMarkdown(source: string, issues: MarkdownIssue[]): Promise<string> {
  const { applyFixes } = await import('markdownlint')
  return applyFixes(source, issues
    .filter(problem => problem.fixInfo)
    .map(problem => ({ lineNumber: problem.line, fixInfo: problem.fixInfo })))
}

function mermaidLine(error: unknown): { line: number, column: number } | undefined {
  const hash = (error as { hash?: { loc?: { first_line?: number, first_column?: number } } }).hash
  const line = hash?.loc?.first_line
  const column = hash?.loc?.first_column
  if (!line)
    return undefined
  return { line, column: column ?? 1 }
}

// Mermaid's own message joins the diagram's lines into one excerpt and lists
// grammar token names, neither of which a writer can act on.
function mermaidDetail(error: unknown): string | undefined {
  const text = (error as { hash?: { text?: string } }).hash?.text
  if (text === undefined)
    return undefined
  return text.trim() ? `在 ${text} 附近出错` : '这一行在没写完的地方结束了'
}

async function inspectMermaid(blocks: MermaidBlock[]): Promise<MarkdownIssue[]> {
  if (!blocks.length)
    return []

  const mermaid = (await import('mermaid')).default
  mermaid.initialize({ startOnLoad: false, securityLevel: 'loose' })
  const issues: MarkdownIssue[] = []

  for (const block of blocks) {
    try {
      await mermaid.parse(block.content)
    }
    catch (error) {
      const at = mermaidLine(error)
      issues.push(issue(
        block.line + (at?.line ?? 1) - 1,
        at?.column ?? 1,
        'MERMAID',
        mermaidDetail(error),
      ))
    }
  }

  return issues
}

export async function lintMarkdown(source: string, options: MarkdownValidationOptions = {}): Promise<MarkdownIssue[]> {
  const { blocks, issues: fenceIssues } = inspectFences(source)
  const containerIssues = inspectContainers(source, blocks)
  const linkIssues = options.pages ? inspectLinks(source, blocks, options.pages) : []
  const altIssues = inspectAlt(source, blocks)

  const { lint } = await import('markdownlint/promise')
  const results = await lint({
    strings: { draft: source },
    config: options.archived ? ARCHIVED_CONFIG : MARKDOWNLINT_CONFIG,
    resultVersion: 3,
  })

  const mermaid = options.mermaid === false
    ? []
    : blocks
        .filter(block => block.closed && /^(?:mermaid|mmd)(?:\s|$)/i.test(block.info))
        .map(block => ({ line: block.line + 1, content: block.content.join('\n') }))

  return [
    ...(results.draft ?? [])
      .filter(error => !AUTO_FIXED.has(error.ruleNames[0] ?? ''))
      .map(markdownlintIssue),
    ...fenceIssues,
    ...containerIssues,
    ...linkIssues,
    ...altIssues,
    ...await inspectMermaid(mermaid),
  ].sort((left, right) => left.line - right.line || left.column - right.column || left.rule.localeCompare(right.rule))
}
