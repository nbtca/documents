// Pipe tables written by hand drift out of line and lose cells, which MD055
// and MD056 then report. Rebuilding the whole table from its cells fixes both
// at once, the way Inkdrop's and Typora's table commands do.

type Align = 'left' | 'center' | 'right' | undefined

// CJK and full-width forms take two columns in a monospace font, so they pad
// as two; anything else counts as one.
// Also the CJK punctuation block (U+3000 to U+303F) and full-width forms
// (U+FF00 to U+FFEF), such as “，” and “１”.
const WIDE = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\u{3000}-\u{303F}\u{FF00}-\u{FFEF}]/u

function width(text: string): number {
  let total = 0
  for (const char of text)
    total += WIDE.test(char) ? 2 : 1
  return total
}

function cells(line: string): string[] {
  const body = line.trim().replace(/^\|/, '').replace(/(?<!\\)\|$/, '')
  return body.split(/(?<!\\)\|/).map(cell => cell.trim())
}

function alignOf(cell: string): Align {
  const left = cell.startsWith(':')
  const right = cell.endsWith(':')
  return left && right ? 'center' : right ? 'right' : left ? 'left' : undefined
}

function pad(text: string, size: number, align: Align): string {
  const gap = size - width(text)
  if (align === 'right')
    return ' '.repeat(gap) + text
  if (align === 'center')
    return ' '.repeat(Math.floor(gap / 2)) + text + ' '.repeat(Math.ceil(gap / 2))
  return text + ' '.repeat(gap)
}

function rule(size: number, align: Align): string {
  const dashes = '-'.repeat(Math.max(3, size) - (align === 'center' ? 2 : align ? 1 : 0))
  return align === 'center' ? `:${dashes}:` : align === 'right' ? `${dashes}:` : align === 'left' ? `:${dashes}` : dashes
}

export function formatTable(source: string, extraRow = false): string {
  const lines = source.split('\n').filter(line => line.trim())
  if (lines.length < 2)
    return source
  const [head, delimiter, ...body] = lines.map(cells)
  const rows = [head, ...body, ...(extraRow ? [[]] : [])]
  const columns = Math.max(head.length, delimiter.length, ...body.map(row => row.length))
  const aligns = Array.from({ length: columns }, (_, i) => alignOf(delimiter[i] ?? ''))
  const sizes = Array.from({ length: columns }, (_, i) => Math.max(3, ...rows.map(row => width(row[i] ?? ''))))
  const line = (row: string[]) => `| ${sizes.map((size, i) => pad(row[i] ?? '', size, aligns[i])).join(' | ')} |`
  return [
    line(head),
    `| ${sizes.map((size, i) => rule(size, aligns[i])).join(' | ')} |`,
    ...rows.slice(1).map(line),
  ].join('\n')
}

// Cell boundaries in a formatted table line, as offsets of each cell's text.
export function cellStarts(line: string): number[] {
  const starts: number[] = []
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '|' && line[i - 1] !== '\\' && i < line.trimEnd().length - 1)
      starts.push(i + 2)
  }
  return starts
}
