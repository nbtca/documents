import { CompletionContext } from '@codemirror/autocomplete'
import { EditorSelection, EditorState } from '@codemirror/state'
import { describe, expect, it } from 'vitest'
import { lintMarkdown } from '../../../utils/markdown-validation'
import { cleanPaste, insertBlock, linkCompletion } from './codemirror'

function run(doc: string, anchor: number, head = anchor, kind: 'fence' | 'tip' = 'fence') {
  const state = EditorState.create({ doc, selection: EditorSelection.single(anchor, head) })
  const next = state.update(insertBlock(state, kind)).state
  const { from, to } = next.selection.main
  return { text: next.doc.toString(), selected: next.sliceDoc(from, to) }
}

describe('insertBlock', () => {
  it('opens a text code block on an empty line', () => {
    expect(run('# T\n\n', 5)).toEqual({ text: '# T\n\n```text\n代码\n```', selected: '代码' })
  })

  it('starts a new block after a line of prose', () => {
    expect(run('# T\n\nText', 9)).toEqual({ text: '# T\n\nText\n\n```text\n代码\n```', selected: '代码' })
  })

  it('wraps the selected lines and pads them with blank lines', () => {
    const doc = '# T\n\nBefore\nlet a\nAfter\n'
    const start = doc.indexOf('let')
    expect(run(doc, start + 1, start + 3, 'tip')).toEqual({
      text: '# T\n\nBefore\n\n::: tip\nlet a\n:::\n\nAfter\n',
      selected: 'let a',
    })
  })

  it('produces Markdown that passes the check', async () => {
    const { text } = run('# T\n\nText\n', 9, 9, 'tip')
    expect(await lintMarkdown(`${text}\n`, { mermaid: false })).toEqual([])
  })
})

describe('cleanPaste', () => {
  it('turns characters copied from chat apps into plain Markdown', () => {
    expect(cleanPaste('#\u3000标题\r\n\u3000\u3000第一段\u00A0文字\u200B\r\n-\t列表\n\t- 子项'))
      .toBe('# 标题\n第一段 文字\n- 列表\n  - 子项')
  })

  it('leaves code-like text alone', () => {
    expect(cleanPaste('#   comment\necho  hi')).toBe('#   comment\necho  hi')
  })
})

describe('linkCompletion', () => {
  const pages = [
    { path: '/archived/2024/2024-11-30-repair-day-plan', title: '2024.11.30 理工维修日策划案' },
    { path: '/repair/checklist', title: '维修日检查单' },
    { path: '/repair/repair-day', title: '维修日' },
    { path: '/about/join', title: '加入协会' },
  ]
  const complete = (doc: string) => {
    const state = EditorState.create({ doc })
    return linkCompletion(pages)(new CompletionContext(state, doc.length, false))
  }

  it('ranks the exact title first and archive records last', () => {
    expect(complete('见[维修日](维修日')!.options.map(option => option.label))
      .toEqual(['/repair/repair-day', '/repair/checklist', '/archived/2024/2024-11-30-repair-day-plan'])
  })

  it('stays out of external links and anchors', () => {
    expect(complete('[a](https://x')).toBeNull()
    expect(complete('[a](#')).toBeNull()
  })
})
