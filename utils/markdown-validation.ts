import type { Configuration, LintError } from 'markdownlint'

export const MARKDOWNLINT_CONFIG = {
  MD013: false,
  MD033: false,
  MD041: false,
  MD049: false,
} satisfies Configuration

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
}

export interface MarkdownIssue {
  line: number
  column: number
  rule: string
  message: string
  detail?: string
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

const RULE_MESSAGES: Record<string, string> = {
  MD001: '标题层级一次只能增加一级',
  MD003: '标题写法不一致',
  MD004: '无序列表使用的符号不一致',
  MD005: '同级列表项的缩进不一致',
  MD007: '嵌套列表的缩进不正确',
  MD009: '行尾有多余空格',
  MD010: '使用了制表符，请换成空格',
  MD012: '连续空行太多',
  MD018: '井号后需要空格',
  MD019: '标题的井号后只能有一个空格',
  MD020: '闭合式标题前后需要空格',
  MD021: '闭合式标题内只能有一个空格',
  MD022: '标题前后需要空行',
  MD023: '标题前不能有缩进',
  MD024: '有内容相同的标题',
  MD025: '一页只能有一个一级标题',
  MD026: '标题末尾不能有标点',
  MD027: '引用符号后只能有一个空格',
  MD028: '引用块之间不能直接留空行',
  MD029: '有序列表的编号不一致',
  MD030: '列表标记后只能有一个空格',
  MD031: '代码块前后需要空行',
  MD032: '列表前后需要空行',
  MD033: '这里不允许直接写 HTML',
  MD034: '裸网址需要写成链接或放进尖括号',
  MD035: '分隔线的写法不一致',
  MD036: '不要用强调代替标题',
  MD037: '强调标记内部不能多出空格',
  MD038: '行内代码标记内部不能多出空格',
  MD039: '链接文字两边不能多出空格',
  MD040: '代码块需要标明语言',
  MD041: '第一行应该是一级标题',
  MD042: '链接地址不能为空',
  MD043: '标题结构不符合约定',
  MD044: '专有名词的大小写不一致',
  MD045: '图片缺少替代文字',
  MD046: '代码块风格不一致',
  MD047: '文件末尾只能有一个换行',
  MD048: '代码围栏的符号不一致',
  MD049: '强调符号的风格不一致',
  MD050: '加粗符号的风格不一致',
  MD051: '站内链接的锚点不存在',
  MD052: '引用链接或图片没有对应定义',
  MD053: '链接定义没有被使用',
  MD054: '链接或图片的写法不一致',
  MD055: '表格行格式不一致',
  MD056: '表格列数不一致',
  MD058: '表格前后需要空行',
  MERMAID: 'Mermaid 图表语法错误',
  FENCE: '代码块没有关闭',
  CONTAINER: '容器标记没有配对',
}

function issue(line: number, column: number, rule: string, detail?: string): MarkdownIssue {
  const value: MarkdownIssue = {
    line: Math.max(1, line),
    column: Math.max(1, column),
    rule,
    message: RULE_MESSAGES[rule] ?? rule,
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
  const fenced = new Set<number>()
  for (const fence of fences) {
    for (let line = fence.line; line <= fence.line + fence.content.length + (fence.closed ? 1 : 0); line++)
      fenced.add(line)
  }

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

function markdownlintIssue(error: LintError): MarkdownIssue {
  const rule = error.ruleNames[0] ?? 'MARKDOWNLINT'
  const column = error.errorRange?.[0] ?? 1
  return issue(
    error.lineNumber,
    column,
    rule,
    error.errorDetail || error.errorContext || undefined,
  )
}

function mermaidLine(error: unknown): { line: number, column: number } | undefined {
  const hash = (error as { hash?: { loc?: { first_line?: number, first_column?: number } } }).hash
  const line = hash?.loc?.first_line
  const column = hash?.loc?.first_column
  if (!line)
    return undefined
  return { line, column: column ?? 1 }
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
        error instanceof Error ? error.message.split('\n')[0] : String(error),
      ))
    }
  }

  return issues
}

// The submit path fixes these before opening a pull request, so flagging them
// would point at a line that is about to disappear and block a valid draft.
const AUTO_FIXED = new Set(['MD009', 'MD012', 'MD047'])

export async function lintMarkdown(source: string, options: MarkdownValidationOptions = {}): Promise<MarkdownIssue[]> {
  const { blocks, issues: fenceIssues } = inspectFences(source)
  const containerIssues = inspectContainers(source, blocks)

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
    ...await inspectMermaid(mermaid),
  ].sort((left, right) => left.line - right.line || left.column - right.column || left.rule.localeCompare(right.rule))
}
