import type { CompletionContext, CompletionResult } from '@codemirror/autocomplete'
import type { Extension, Range, TransactionSpec } from '@codemirror/state'
import type { DecorationSet, ViewUpdate } from '@codemirror/view'
import type { MarkdownIssue } from '../../../utils/markdown-validation'
import type { TypographyHint } from '../../../utils/typography'
import { autocompletion, completionKeymap } from '@codemirror/autocomplete'
import { defaultKeymap, history, historyKeymap, indentLess, indentMore } from '@codemirror/commands'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { syntaxTree } from '@codemirror/language'
import { highlightSelectionMatches, search, searchKeymap } from '@codemirror/search'
import { Compartment, EditorSelection, EditorState, RangeSet, StateEffect, StateField } from '@codemirror/state'
import { Decoration, EditorView, keymap, placeholder, ViewPlugin, WidgetType } from '@codemirror/view'
import { codeParts, plainText } from '../../../utils/markdown-rules'

const HEADING = /^ATXHeading([1-6])$/
const MARK_CLASS: Record<string, string> = {
  StrongEmphasis: 'cm-nb-strong',
  Emphasis: 'cm-nb-em',
  InlineCode: 'cm-nb-code',
  Strikethrough: 'cm-nb-strike',
}
const MARKER_WIDTH: Record<string, number> = {
  StrongEmphasis: 2,
  Emphasis: 1,
  InlineCode: 1,
  Strikethrough: 2,
}

const hide = Decoration.replace({})
const dimLine = Decoration.line({ class: 'cm-nb-dim' })
const linkText = Decoration.mark({ class: 'cm-nb-link' })
const linkUrl = Decoration.mark({ class: 'cm-nb-url' })

// Lezer parses neither frontmatter nor ::: containers.
function dimNonProseLines(state: EditorState, ranges: Range<Decoration>[]) {
  const total = state.doc.lines
  let line = 1

  if (state.doc.line(1).text === '---') {
    ranges.push(dimLine.range(state.doc.line(1).from))
    for (line = 2; line <= total; line++) {
      ranges.push(dimLine.range(state.doc.line(line).from))
      if (state.doc.line(line).text === '---')
        break
    }
  }

  for (let i = 1; i <= total; i++) {
    if (state.doc.line(i).text.startsWith(':::'))
      ranges.push(dimLine.range(state.doc.line(i).from))
  }
}

function linesWithCursor(state: EditorState): Set<number> {
  const lines = new Set<number>()
  for (const range of state.selection.ranges) {
    const from = state.doc.lineAt(range.from).number
    const to = state.doc.lineAt(range.to).number
    for (let line = from; line <= to; line++)
      lines.add(line)
  }
  return lines
}

function styleDoc(state: EditorState): DecorationSet {
  const ranges: Range<Decoration>[] = []
  const active = linesWithCursor(state)

  syntaxTree(state).iterate({
    enter(node) {
      const heading = node.name.match(HEADING)
      if (heading) {
        const line = state.doc.lineAt(node.from)
        ranges.push(Decoration.line({ class: `cm-nb-h${heading[1]}` }).range(line.from))
        if (!active.has(line.number)) {
          const marker = Number(heading[1]) + 1
          if (node.to - node.from > marker)
            ranges.push(hide.range(node.from, node.from + marker))
        }
        return
      }

      if (node.name === 'Link') {
        const line = state.doc.lineAt(node.from).number
        const text = state.doc.sliceString(node.from, node.to)
        const split = text.indexOf('](')
        if (split < 0)
          return
        ranges.push(linkText.range(node.from + 1, node.from + split))
        ranges.push(linkUrl.range(node.from + split + 2, node.to - 1))
        if (!active.has(line)) {
          ranges.push(hide.range(node.from, node.from + 1))
          ranges.push(hide.range(node.from + split, node.to))
        }
        return
      }

      const cls = MARK_CLASS[node.name]
      if (!cls)
        return

      ranges.push(Decoration.mark({ class: cls }).range(node.from, node.to))

      const width = MARKER_WIDTH[node.name]
      if (active.has(state.doc.lineAt(node.from).number) || node.to - node.from <= width * 2)
        return

      ranges.push(hide.range(node.from, node.from + width))
      ranges.push(hide.range(node.to - width, node.to))
    },
  })

  dimNonProseLines(state, ranges)
  ranges.sort((a, b) => a.from - b.from || a.value.startSide - b.value.startSide)
  return RangeSet.of(ranges, true)
}

class IssueMessage extends WidgetType {
  constructor(readonly issues: MarkdownIssue[]) {
    super()
  }

  eq(other: IssueMessage): boolean {
    return JSON.stringify(this.issues) === JSON.stringify(other.issues)
  }

  toDOM(): HTMLElement {
    const container = document.createElement('div')
    container.className = 'cm-nb-issue-messages'
    for (const issue of this.issues) {
      const message = document.createElement('div')
      message.className = 'cm-nb-issue-message'
      const summary = document.createElement('div')
      summary.textContent = `${issue.rule} · ${issue.message}`
      message.append(summary)
      if (issue.fix) {
        const fix = document.createElement('div')
        fix.className = 'cm-nb-issue-fix'
        for (const part of codeParts(issue.fix)) {
          const node = document.createElement(part.code ? 'code' : 'span')
          node.textContent = part.text
          fix.append(node)
        }
        message.append(fix)
      }
      if (issue.detail && issue.detail !== issue.message) {
        const detail = document.createElement('div')
        detail.className = 'cm-nb-issue-detail'
        detail.textContent = issue.detail
        message.append(detail)
      }
      container.append(message)
    }
    return container
  }
}

function issueDecorations(state: EditorState, issues: MarkdownIssue[], quiet?: number): DecorationSet {
  const ranges: Range<Decoration>[] = []
  const byLine = new Map<number, MarkdownIssue[]>()
  for (const problem of issues) {
    if (!problem.line || problem.line > state.doc.lines)
      continue
    const line = state.doc.line(problem.line)
    const messages = byLine.get(problem.line) ?? []
    messages.push(problem)
    byLine.set(problem.line, messages)
    ranges.push(Decoration.line({ class: 'cm-nb-issue-line' }).range(line.from))
    const start = Math.min(line.to, line.from + Math.max(0, problem.column - 1))
    if (start < line.to)
      ranges.push(Decoration.mark({ class: 'cm-nb-issue-text' }).range(start, Math.min(line.to, start + 1)))
    else if (line.length)
      ranges.push(Decoration.mark({ class: 'cm-nb-issue-text' }).range(line.to - 1, line.to))
  }
  for (const [number, messages] of byLine) {
    if (number === quiet)
      continue
    ranges.push(Decoration.widget({
      widget: new IssueMessage(messages),
      block: true,
      side: 1,
    }).range(state.doc.line(number).to))
  }
  return RangeSet.of(ranges, true)
}

const setHints = StateEffect.define<TypographyHint[]>()

// Typography is advice, not a gate: a faint dotted underline with the reason
// on hover, and nothing that pushes the text around.
const hintField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(decorations, transaction) {
    for (const effect of transaction.effects) {
      if (!effect.is(setHints))
        continue
      const { doc } = transaction.state
      const ranges = effect.value.flatMap((hint) => {
        if (hint.line > doc.lines)
          return []
        const line = doc.line(hint.line)
        const from = Math.min(line.to, line.from + hint.column - 1)
        const to = Math.min(line.to, from + Math.max(1, hint.length))
        const start = hint.length ? from : Math.max(line.from, from - 1)
        return start < to ? [Decoration.mark({ class: 'cm-nb-hint', attributes: { title: hint.message } }).range(start, to)] : []
      })
      return Decoration.set(ranges, true)
    }
    return decorations.map(transaction.changes)
  },
  provide: field => EditorView.decorations.from(field),
})

export function setTypographyHints(view: EditorView, hints: TypographyHint[]): void {
  view.dispatch({ effects: setHints.of(hints) })
}

const setIssues = StateEffect.define<MarkdownIssue[]>()
const showLine = StateEffect.define<null>()

interface IssueState {
  issues: MarkdownIssue[]
  quiet?: number
  decorations: DecorationSet
}

const cursorLine = (state: EditorState) => state.doc.lineAt(state.selection.main.head).number

// Results land while the writer may still be typing; a block widget under
// that line would push the text they are looking at down the screen.
const issueField = StateField.define<IssueState>({
  create: () => ({ issues: [], decorations: Decoration.none }),
  update(value, transaction) {
    const { state } = transaction
    for (const effect of transaction.effects) {
      if (effect.is(setIssues)) {
        const quiet = cursorLine(state)
        return { issues: effect.value, quiet, decorations: issueDecorations(state, effect.value, quiet) }
      }
      if (effect.is(showLine))
        return { ...value, quiet: undefined, decorations: issueDecorations(state, value.issues) }
    }
    if (transaction.docChanged)
      return { ...value, decorations: value.decorations.map(transaction.changes) }
    if (value.quiet !== undefined && transaction.selection && cursorLine(state) !== value.quiet)
      return { ...value, quiet: undefined, decorations: issueDecorations(state, value.issues) }
    return value
  },
  provide: field => EditorView.decorations.from(field, value => value.decorations),
})

export function setMarkdownIssues(view: EditorView, issues: MarkdownIssue[]): void {
  view.dispatch({ effects: setIssues.of(issues) })
}

function issuePosition(state: EditorState, problem: MarkdownIssue): number {
  const line = state.doc.line(Math.min(Math.max(1, problem.line), state.doc.lines))
  return Math.min(line.to, line.from + Math.max(0, problem.column - 1))
}

export function revealMarkdownIssue(view: EditorView, problem: MarkdownIssue): void {
  const position = issuePosition(view.state, problem)
  // The wavy underline is all a sighted writer needs; a screen reader user
  // landing here hears only the line's text without this.
  const said = `第 ${problem.line} 行：${problem.message}。${problem.fix ? plainText(problem.fix) : ''}`
  view.dispatch({
    selection: { anchor: position },
    effects: [showLine.of(null), EditorView.scrollIntoView(position, { y: 'center' }), EditorView.announce.of(said)],
  })
  view.focus()
}

// Source line under a viewport y, with the fraction through that line, so the
// preview can land between two of its blocks rather than jump block to block.
export function lineAtY(view: EditorView, y: number): number {
  const height = Math.max(0, y - view.documentTop)
  const block = view.lineBlockAtHeight(height)
  const line = view.state.doc.lineAt(block.from).number
  return line + Math.min(1, Math.max(0, (height - block.top) / (block.height || 1)))
}

export function yForLine(view: EditorView, line: number): number {
  const number = Math.min(Math.max(1, Math.floor(line)), view.state.doc.lines)
  const block = view.lineBlockAt(view.state.doc.line(number).from)
  return view.documentTop + block.top + (line - number) * block.height
}

function stepIssue(view: EditorView, direction: 1 | -1): boolean {
  const { state } = view
  const stops = state.field(issueField).issues.map(problem => ({ problem, at: issuePosition(state, problem) }))
  if (!stops.length)
    return false
  const head = state.selection.main.head
  const next = direction === 1
    ? stops.find(stop => stop.at > head) ?? stops[0]
    : stops.findLast(stop => stop.at < head) ?? stops.at(-1)!
  revealMarkdownIssue(view, next.problem)
  return true
}

const liveStyling = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet

    constructor(view: EditorView) {
      this.decorations = styleDoc(view.state)
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.selectionSet || update.viewportChanged)
        this.decorations = styleDoc(update.state)
    }
  },
  { decorations: plugin => plugin.decorations },
)

const theme = EditorView.theme({
  '&': { minHeight: 'calc(100vh - 10rem)', fontSize: '16px', color: 'var(--vp-c-text-1)' },
  '.cm-content': {
    fontFamily: 'var(--vp-font-family-base)',
    lineHeight: '1.75',
    padding: '34px 0 40vh',
    maxWidth: 'var(--nb-measure)',
    margin: '0 auto',
    caretColor: 'var(--vp-c-brand-1)',
  },
  '.cm-scroller': { overflow: 'visible' },
  '&.cm-focused': { outline: 'none' },
  '.cm-line': { padding: '0 21px' },
  '.cm-placeholder': { color: 'var(--vp-c-text-3)' },
  '.cm-selectionBackground, ::selection': { backgroundColor: 'var(--vp-c-brand-soft)' },
  '.cm-cursor': { borderLeftColor: 'var(--vp-c-brand-1)' },

  '.cm-nb-h1': { fontSize: '1.6em', fontWeight: '700', lineHeight: '1.4' },
  '.cm-nb-h2': { fontSize: '1.3em', fontWeight: '700', lineHeight: '1.45' },
  '.cm-nb-h3': { fontSize: '1.12em', fontWeight: '600' },
  '.cm-nb-h4, .cm-nb-h5, .cm-nb-h6': { fontWeight: '600' },
  '.cm-nb-dim': { color: 'var(--vp-c-text-3)', fontFamily: 'var(--nb-mono)', fontSize: '0.85em' },
  '.cm-nb-link': { color: 'var(--vp-c-brand-1)' },
  '.cm-nb-url': { color: 'var(--vp-c-text-3)', fontFamily: 'var(--nb-mono)', fontSize: '0.85em' },
  '.cm-nb-strong': { fontWeight: '700' },
  '.cm-nb-em': { fontStyle: 'italic' },
  '.cm-nb-strike': { textDecoration: 'line-through' },
  '.cm-deletedChunk': { backgroundColor: 'color-mix(in srgb, var(--vp-c-danger-1) 12%, transparent)' },
  '.cm-changedLine': { backgroundColor: 'color-mix(in srgb, var(--vp-c-brand-1) 8%, transparent)' },
  '.cm-changedText': { backgroundColor: 'color-mix(in srgb, var(--vp-c-brand-1) 18%, transparent)' },
  '.cm-nb-issue-line': { backgroundColor: 'color-mix(in srgb, var(--vp-c-danger-1) 7%, transparent)' },
  '.cm-panels': { backgroundColor: 'var(--vp-c-bg)', color: 'var(--vp-c-text-1)' },
  // The sheet scrolls, not the editor, so the panel sticks to the sheet; keep
  // it under the sticky toolbar rather than over it.
  '.cm-panels-top': { top: 'var(--nb-toolbar-height, 0px) !important', zIndex: '1', borderBottom: '1px solid var(--vp-c-divider)' },
  '.cm-panel.cm-search': {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px 8px',
    alignItems: 'center',
    maxWidth: 'var(--nb-measure)',
    margin: '0 auto',
    padding: '8px 40px 8px 21px',
    fontFamily: 'var(--vp-font-family-base)',
    fontSize: '13px',
  },
  '.cm-panel.cm-search br': { flexBasis: '100%', height: 0 },
  '.cm-panel.cm-search label': { display: 'inline-flex', gap: '4px', alignItems: 'center', color: 'var(--vp-c-text-2)' },
  '.cm-textfield': {
    minWidth: '10rem',
    padding: '4px 8px',
    border: '1px solid var(--vp-c-divider)',
    borderRadius: '4px',
    background: 'var(--vp-c-bg)',
    color: 'var(--vp-c-text-1)',
    font: 'inherit',
  },
  '.cm-textfield:focus': { outline: 'none', borderColor: 'var(--vp-c-brand-1)' },
  '.cm-button': {
    padding: '4px 10px',
    border: '1px solid var(--vp-c-divider)',
    borderRadius: '4px',
    backgroundImage: 'none',
    backgroundColor: 'var(--vp-c-bg-soft)',
    color: 'var(--vp-c-text-1)',
    font: 'inherit',
  },
  '.cm-button:active': { backgroundImage: 'none', backgroundColor: 'var(--vp-c-default-soft)' },
  '.cm-panel.cm-search [name=close]': { top: '8px', right: '12px', fontSize: '18px', color: 'var(--vp-c-text-3)' },
  '.cm-searchMatch': { backgroundColor: 'color-mix(in srgb, var(--vp-c-warning-1) 22%, transparent)' },
  '.cm-searchMatch-selected': { backgroundColor: 'color-mix(in srgb, var(--vp-c-warning-1) 45%, transparent)' },
  '.cm-selectionMatch': { backgroundColor: 'color-mix(in srgb, var(--vp-c-brand-1) 12%, transparent)' },
  '.cm-tooltip': {
    border: '1px solid var(--vp-c-divider)',
    borderRadius: '6px',
    backgroundColor: 'var(--vp-c-bg)',
    boxShadow: 'var(--vp-shadow-3)',
    overflow: 'hidden',
  },
  '.cm-tooltip.cm-tooltip-autocomplete > ul': {
    maxWidth: 'min(36rem, calc(100vw - 24px))',
    maxHeight: '15rem',
    fontFamily: 'var(--vp-font-family-base)',
  },
  '.cm-tooltip.cm-tooltip-autocomplete > ul > li': { display: 'flex', gap: '10px', padding: '5px 10px', lineHeight: '1.5' },
  '.cm-tooltip-autocomplete .cm-completionLabel': { order: 2, fontFamily: 'var(--nb-mono)', fontSize: '12px', color: 'var(--vp-c-text-3)', overflow: 'hidden', textOverflow: 'ellipsis' },
  '.cm-tooltip-autocomplete .cm-completionDetail': { order: 1, flex: 'none', marginLeft: 0, fontStyle: 'normal', color: 'var(--vp-c-text-1)' },
  '.cm-tooltip.cm-tooltip-autocomplete > ul > li[aria-selected]': { backgroundColor: 'var(--vp-c-brand-soft)', color: 'var(--vp-c-text-1)' },
  '.cm-tooltip-autocomplete li[aria-selected] .cm-completionLabel': { color: 'var(--vp-c-text-2)' },
  '.cm-nb-hint': { textDecoration: 'underline dotted color-mix(in srgb, var(--vp-c-warning-1) 70%, transparent)', textUnderlineOffset: '4px' },
  '.cm-nb-issue-text': { textDecoration: 'underline wavy var(--vp-c-danger-1)', textUnderlineOffset: '3px' },
  '.cm-nb-issue-messages': {
    maxWidth: 'var(--nb-measure)',
    margin: '4px auto 10px',
    padding: '0 21px',
    boxSizing: 'border-box',
    color: 'var(--vp-c-danger-1)',
    fontFamily: 'var(--vp-font-family-base)',
    fontSize: '13px',
    lineHeight: '1.6',
    whiteSpace: 'pre-wrap',
    overflowWrap: 'anywhere',
  },
  '.cm-nb-issue-message': {
    padding: '5px 10px',
    borderLeft: '2px solid var(--vp-c-danger-1)',
    backgroundColor: 'color-mix(in srgb, var(--vp-c-danger-1) 7%, transparent)',
  },
  '.cm-nb-issue-message + .cm-nb-issue-message': { marginTop: '4px' },
  '.cm-nb-issue-fix': { color: 'var(--vp-c-text-1)' },
  '.cm-nb-issue-fix code': { fontFamily: 'var(--nb-mono)', fontSize: '0.92em' },
  '.cm-nb-issue-detail': { color: 'var(--vp-c-text-2)', fontSize: '12px' },
  '.cm-nb-code': {
    fontFamily: 'var(--nb-mono)',
    fontSize: '0.9em',
    padding: '2px 5px',
    borderRadius: '3px',
    backgroundColor: 'var(--vp-c-bg-soft)',
  },
})

export type Format = 'h1' | 'h2' | 'bold' | 'italic' | 'code' | 'link' | 'list' | 'ordered' | 'quote' | 'fence' | 'tip'

const WRAP: Partial<Record<Format, [string, string]>> = {
  bold: ['**', '加粗'],
  italic: ['*', '斜体'],
  code: ['`', 'code'],
}

const PREFIX: Partial<Record<Format, string>> = {
  h1: '# ',
  h2: '## ',
  list: '- ',
  ordered: '1. ',
  quote: '> ',
}

const BLOCK: Record<'fence' | 'tip', [string, string, string]> = {
  fence: ['```text', '代码', '```'],
  tip: ['::: tip', '提示内容', ':::'],
}

const LINE_MARK = /^(\s*)(#{1,6} |[-*+] |\d+\. |> )?/
const LIST_LINE = /^\s*(?:[-*+]|\d+\.) /

function wrap(view: EditorView, mark: string, filler: string): boolean {
  view.dispatch(view.state.changeByRange((range) => {
    const { from, to } = range
    const doc = view.state.doc
    if (doc.sliceString(from - mark.length, from) === mark && doc.sliceString(to, to + mark.length) === mark) {
      return {
        changes: [{ from: from - mark.length, to: from }, { from: to, to: to + mark.length }],
        range: EditorSelection.range(from - mark.length, to - mark.length),
      }
    }
    const text = from === to ? filler : doc.sliceString(from, to)
    return {
      changes: { from, to, insert: `${mark}${text}${mark}` },
      range: EditorSelection.range(from + mark.length, from + mark.length + text.length),
    }
  }))
  return true
}

function link(view: EditorView): boolean {
  view.dispatch(view.state.changeByRange((range) => {
    const text = range.empty ? '文字' : view.state.doc.sliceString(range.from, range.to)
    const url = range.from + text.length + 3
    return {
      changes: { from: range.from, to: range.to, insert: `[${text}](url)` },
      range: range.empty ? EditorSelection.range(range.from + 1, range.from + 1 + text.length) : EditorSelection.range(url, url + 3),
    }
  }))
  return true
}

// Blank lines around the block satisfy MD031 and keep containers unambiguous.
export function insertBlock(state: EditorState, kind: 'fence' | 'tip'): TransactionSpec {
  const [open, filler, close] = BLOCK[kind]
  return state.changeByRange((range) => {
    const { doc } = state
    const first = doc.lineAt(range.from)
    const last = doc.lineAt(range.to)
    const blank = (n: number) => n < 1 || n > doc.lines || !doc.line(n).text.trim()
    const after = range.empty && !blank(first.number)
    const from = after ? last.to : first.from
    const body = range.empty ? filler : doc.sliceString(first.from, last.to)
    const head = `${after ? '\n\n' : blank(first.number - 1) ? '' : '\n'}${open}\n`
    const tail = blank(last.number + 1) ? '' : '\n'
    const at = from + head.length
    return {
      changes: { from, to: last.to, insert: `${head}${body}\n${close}${tail}` },
      range: EditorSelection.range(at, at + body.length),
    }
  })
}

function prefix(view: EditorView, mark: string): boolean {
  const { state } = view
  const lines = new Set<number>()
  for (const range of state.selection.ranges) {
    for (let n = state.doc.lineAt(range.from).number; n <= state.doc.lineAt(range.to).number; n++)
      lines.add(n)
  }
  const all = [...lines].map(n => state.doc.line(n))
  const off = all.every(line => line.text.trimStart().startsWith(mark))
  view.dispatch({
    changes: all.map((line) => {
      const [, indent, existing = ''] = line.text.match(LINE_MARK)!
      const from = line.from + indent.length
      return { from, to: from + existing.length, insert: off ? '' : mark }
    }),
  })
  return true
}

export function format(view: EditorView, kind: Format): boolean {
  const wrapper = WRAP[kind]
  const done = wrapper
    ? wrap(view, ...wrapper)
    : kind === 'fence' || kind === 'tip'
      ? (view.dispatch(insertBlock(view.state, kind)), true)
      : kind === 'link' ? link(view) : prefix(view, PREFIX[kind]!)
  view.focus()
  return done
}

const onListLine = (view: EditorView) => LIST_LINE.test(view.state.doc.lineAt(view.state.selection.main.head).text)

const formatKeymap = keymap.of([
  { key: 'Mod-b', run: view => format(view, 'bold') },
  { key: 'Mod-i', run: view => format(view, 'italic') },
  { key: 'Mod-e', run: view => format(view, 'code') },
  { key: 'Mod-k', run: view => format(view, 'link') },
  { key: 'Mod-Shift-8', run: view => format(view, 'list') },
  { key: 'Mod-Shift-7', run: view => format(view, 'ordered') },
  { key: 'Mod-Shift-.', run: view => format(view, 'quote') },
  { key: 'F8', run: view => stepIssue(view, 1) },
  { key: 'Shift-F8', run: view => stepIssue(view, -1) },
  // Only inside a list, so Tab still leaves the editor everywhere else.
  { key: 'Tab', run: view => onListLine(view) && indentMore(view) },
  { key: 'Shift-Tab', run: view => onListLine(view) && indentLess(view) },
])

export interface SitePage {
  path: string
  title: string
}

// Writers cannot guess a page's address, and a mistyped one only surfaces as
// a broken link after review. After `](` the list filters on both the path
// and the Chinese title, since the title is what a writer remembers.
export function linkCompletion(pages: readonly SitePage[]) {
  return (context: CompletionContext): CompletionResult | null => {
    const typed = context.matchBefore(/\]\([^\s)]*$/)
    if (!typed || /^\]\((?:https?:|#|\.)/.test(typed.text))
      return null
    const query = typed.text.slice(2).toLowerCase()
    return {
      from: typed.from + 2,
      options: pages
        .flatMap((page) => {
          const title = page.title.toLowerCase()
          const path = page.path.toLowerCase()
          if (!title.includes(query) && !path.includes(query))
            return []
          // An exact title first, archive records last: a writer linking
          // “维修日” means the guide, not one year's plan for it.
          const rank = (title === query ? 0 : title.startsWith(query) ? 1 : 2) + (path.startsWith('/archived/') ? 3 : 0)
          return [{ label: page.path, detail: page.title, type: 'text', boost: -rank }]
        })
        .sort((left, right) => right.boost - left.boost)
        .slice(0, 50),
      filter: false,
    }
  }
}

const URL_ONLY = /^https?:\/\/\S+$/

// Text copied from chat apps and word processors carries characters that
// markdownlint flags (MD010, MD018) but that look like ordinary spaces.
export function cleanPaste(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/[\u00A0\u2007\u202F]/g, ' ')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/^(#{1,6})\u3000+/gm, '$1 ')
    .replace(/^\u3000+/gm, '')
    .replace(/^(\s*(?:[-*+]|\d+\.))\t+/gm, '$1 ')
    .replace(/\t/g, '  ')
}

function files(handle: (files: File[]) => void) {
  return EditorView.domEventHandlers({
    paste(event, view) {
      const dropped = [...event.clipboardData?.files ?? []]
      if (dropped.length) {
        event.preventDefault()
        handle(dropped)
        return true
      }
      const text = event.clipboardData?.getData('text/plain').trim() ?? ''
      const range = view.state.selection.main
      if (!URL_ONLY.test(text) || range.empty || view.state.doc.lineAt(range.from).number !== view.state.doc.lineAt(range.to).number)
        return false
      event.preventDefault()
      const words = view.state.doc.sliceString(range.from, range.to)
      view.dispatch({ changes: { from: range.from, to: range.to, insert: `[${words}](${text})` } })
      return true
    },
    drop(event, view) {
      const dropped = [...event.dataTransfer?.files ?? []]
      if (!dropped.length)
        return false
      event.preventDefault()
      const at = view.posAtCoords({ x: event.clientX, y: event.clientY })
      if (at !== null)
        view.dispatch({ selection: { anchor: at } })
      handle(dropped)
      return true
    },
  })
}

const diffing = new Compartment()

export async function setDiff(view: EditorView, original: string | undefined): Promise<void> {
  const extension = original === undefined
    ? []
    : (await import('@codemirror/merge')).unifiedMergeView({
        original,
        mergeControls: false,
        gutter: true,
      })
  view.dispatch({ effects: diffing.reconfigure(extension) })
}

// CodeMirror's own panels speak English unless their phrases are supplied.
const PHRASES = EditorState.phrases.of({
  'Find': '查找',
  'Replace': '替换为',
  'next': '下一个',
  'previous': '上一个',
  'all': '全部',
  'match case': '区分大小写',
  'regexp': '正则',
  'by word': '整词',
  'replace': '替换',
  'replace all': '全部替换',
  'close': '关闭',
  'current match': '当前匹配',
  'on line': '位于行',
  'replaced $ matches': '已替换 $ 处',
  'replaced match on line $': '已替换第 $ 行的匹配',
  'Go to line': '跳到行',
  'go': '跳转',
  'Completions': '补全建议',
  'Control character': '控制字符',
  'Selection deleted': '已删除选中内容',
})

export function mountEditor(
  parent: HTMLElement,
  doc: string,
  onChange: (value: string) => void,
  onSave: () => void,
  onFiles: (files: File[]) => void,
  hint?: string,
  pages: readonly SitePage[] = [],
): EditorView {
  const extensions: Extension[] = [
    history(),
    PHRASES,
    search({ top: true }),
    highlightSelectionMatches(),
    autocompletion({ override: [linkCompletion(pages)], icons: false }),
    placeholder(hint ?? ''),
    formatKeymap,
    files(onFiles),
    EditorView.clipboardInputFilter.of(cleanPaste),
    keymap.of([
      ...['Mod-s', 'Mod-Enter'].map(key => ({
        key,
        preventDefault: true,
        run: () => {
          onSave()
          return true
        },
      })),
      ...completionKeymap,
      ...searchKeymap,
      ...defaultKeymap,
      ...historyKeymap,
    ]),
    markdown({ base: markdownLanguage }),
    EditorView.contentAttributes.of({ 'aria-label': 'Markdown 源码', 'aria-describedby': 'nb-edit-keys' }),
    EditorView.lineWrapping,
    liveStyling,
    issueField,
    hintField,
    diffing.of([]),
    theme,
    EditorView.updateListener.of((update) => {
      if (update.docChanged)
        onChange(update.state.doc.toString())
    }),
  ]

  return new EditorView({ state: EditorState.create({ doc, extensions }), parent })
}
