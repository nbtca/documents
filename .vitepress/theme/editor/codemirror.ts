import type { Extension, Range } from '@codemirror/state'
import type { DecorationSet, ViewUpdate } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { syntaxTree } from '@codemirror/language'
import { EditorState, RangeSet } from '@codemirror/state'
import { Decoration, EditorView, keymap, ViewPlugin } from '@codemirror/view'

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

// Lezer does not parse frontmatter or VitePress containers; both are
// line-shaped, so a scan is enough and costs nothing on a page-sized doc.
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

// View-only: the document stays exactly the markdown that gets saved. Markers
// show on the line being edited so the syntax stays learnable.
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
  '&': { height: '100%', fontSize: '15px', color: 'var(--vp-c-text-1)' },
  '.cm-content': {
    fontFamily: 'var(--vp-font-family-base)',
    lineHeight: '1.75',
    padding: '13px 0 40vh',
    caretColor: 'var(--vp-c-brand-1)',
  },
  '.cm-scroller': { overflow: 'auto' },
  '&.cm-focused': { outline: 'none' },
  '.cm-line': { padding: '0 18px' },
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
  '.cm-nb-code': {
    fontFamily: 'var(--nb-mono)',
    fontSize: '0.9em',
    padding: '2px 5px',
    borderRadius: '3px',
    backgroundColor: 'var(--vp-c-bg-soft)',
  },
})

export function mountEditor(
  parent: HTMLElement,
  doc: string,
  onChange: (value: string) => void,
  onSave: () => void,
): EditorView {
  const extensions: Extension[] = [
    history(),
    keymap.of([
      {
        key: 'Mod-s',
        preventDefault: true,
        run: () => {
          onSave()
          return true
        },
      },
      ...defaultKeymap,
      ...historyKeymap,
    ]),
    markdown({ base: markdownLanguage }),
    EditorView.lineWrapping,
    liveStyling,
    theme,
    EditorView.updateListener.of((update) => {
      if (update.docChanged)
        onChange(update.state.doc.toString())
    }),
  ]

  return new EditorView({ state: EditorState.create({ doc, extensions }), parent })
}
