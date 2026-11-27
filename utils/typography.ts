import type { FixInfo } from 'markdownlint'
import { isFenceMarker } from './markdown'

export interface TypographyHint {
  line: number
  column: number
  length: number
  message: string
  fixInfo: FixInfo
}

const HAN = '\\p{Script=Han}'
const LATIN = '[A-Za-z0-9]'
// Full-width forms sit 0xFEE0 above their ASCII letters and digits.
const wide = (from: string, to: string) => `\\u${(from.charCodeAt(0) + 0xFEE0).toString(16)}-\\u${(to.charCodeAt(0) + 0xFEE0).toString(16)}`
const FULLWIDTH_ALNUM = new RegExp(`[${wide('0', '9')}${wide('A', 'Z')}${wide('a', 'z')}]+`, 'g')

const RULES: Array<{ pattern: RegExp, message: string, replace: (match: RegExpExecArray) => string }> = [
  {
    // The site spaces numbers too (“2010 年”, about 900 times against 16).
    pattern: new RegExp(`(?<=${HAN})(?=${LATIN})|(?<=${LATIN})(?=${HAN})`, 'gu'),
    message: '中文和英文、数字之间通常空一格',
    replace: () => ' ',
  },
  {
    pattern: /[「」『』]/g,
    message: '本站引号统一用 “” 和 ‘’',
    replace: match => ({ '「': '“', '」': '”', '『': '‘', '』': '’' })[match[0]]!,
  },
  {
    pattern: new RegExp(`(?<=${HAN})[,;:?!](?=\\s|$|${HAN})`, 'gu'),
    message: '中文句子里用全角标点',
    replace: match => ({ ',': '，', ';': '；', ':': '：', '?': '？', '!': '！' })[match[0]]!,
  },
  {
    pattern: FULLWIDTH_ALNUM,
    message: '数字和英文字母用半角',
    replace: match => [...match[0]].map(c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0)).join(''),
  },
  {
    pattern: /。{3,}|(?<=\p{Script=Han})\.{3,}/gu,
    message: '省略号写成 ……',
    replace: () => '……',
  },
]

// Code, link targets, HTML tags and front matter are not prose. Blanking them
// keeps columns aligned while hiding them from every rule; the output is only
// scanned for hints, never rendered, so this is not the sanitiser stripTags is.
const TAG = /<[^>]*>/g

function prose(source: string): string[] {
  const blank = (text: string) => text.replace(/[^\n]/g, ' ')
  let fence = ''
  let front = source.startsWith('---\n')
  return source.split('\n').map((text, index) => {
    const trimmed = text.trimStart()
    if (front) {
      if (index > 0 && text === '---')
        front = false
      return blank(text)
    }
    if (fence) {
      if (trimmed.startsWith(fence))
        fence = ''
      return blank(text)
    }
    if (isFenceMarker(trimmed)) {
      fence = trimmed.slice(0, 3)
      return blank(text)
    }
    return text
      .replace(/`+[^`]*`+/g, blank)
      .replace(/\]\([^)]*\)/g, match => `]${blank(match.slice(1))}`)
      .replace(TAG, blank)
      .replace(/https?:\/\/\S+/g, blank)
  })
}

export function typographyHints(source: string): TypographyHint[] {
  const hints: TypographyHint[] = []
  prose(source).forEach((text, index) => {
    for (const rule of RULES) {
      for (const match of text.matchAll(rule.pattern)) {
        const column = match.index + 1
        hints.push({
          line: index + 1,
          column,
          length: match[0].length,
          message: rule.message,
          fixInfo: { lineNumber: index + 1, editColumn: column, deleteCount: match[0].length, insertText: rule.replace(match as RegExpExecArray) },
        })
      }
    }
  })
  return hints.sort((left, right) => left.line - right.line || left.column - right.column)
}
