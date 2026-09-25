import type { Extension, Range } from '@codemirror/state'
import type { DecorationSet, ViewUpdate } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap, indentLess, indentMore } from '@codemirror/commands'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { syntaxTree } from '@codemirror/language'
import { Compartment, EditorSelection, EditorState, RangeSet } from '@codemirror/state'
import { Decoration, EditorView, keymap, placeholder, ViewPlugin } from '@codemirror/view'

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
  '.cm-nb-code': {
    fontFamily: 'var(--nb-mono)',
    fontSize: '0.9em',
    padding: '2px 5px',
    borderRadius: '3px',
    backgroundColor: 'var(--vp-c-bg-soft)',
  },
})

export type Format = 'h1' | 'h2' | 'bold' | 'italic' | 'code' | 'link' | 'list' | 'ordered' | 'quote'

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
  const done = wrapper ? wrap(view, ...wrapper) : kind === 'link' ? link(view) : prefix(view, PREFIX[kind]!)
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
  // Only inside a list, so Tab still leaves the editor everywhere else.
  { key: 'Tab', run: view => onListLine(view) && indentMore(view) },
  { key: 'Shift-Tab', run: view => onListLine(view) && indentLess(view) },
])

const URL_ONLY = /^https?:\/\/\S+$/

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

export function mountEditor(
  parent: HTMLElement,
  doc: string,
  onChange: (value: string) => void,
  onSave: () => void,
  onFiles: (files: File[]) => void,
  hint?: string,
): EditorView {
  const extensions: Extension[] = [
    history(),
    placeholder(hint ?? ''),
    formatKeymap,
    files(onFiles),
    keymap.of([
      ...['Mod-s', 'Mod-Enter'].map(key => ({
        key,
        preventDefault: true,
        run: () => {
          onSave()
          return true
        },
      })),
      ...defaultKeymap,
      ...historyKeymap,
    ]),
    markdown({ base: markdownLanguage }),
    EditorView.lineWrapping,
    liveStyling,
    diffing.of([]),
    theme,
    EditorView.updateListener.of((update) => {
      if (update.docChanged)
        onChange(update.state.doc.toString())
    }),
  ]

  return new EditorView({ state: EditorState.create({ doc, extensions }), parent })
}
