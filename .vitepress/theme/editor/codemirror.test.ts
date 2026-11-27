import { CompletionContext } from '@codemirror/autocomplete'
import { EditorSelection, EditorState } from '@codemirror/state'
import { describe, expect, it } from 'vitest'
import { lintMarkdown } from '../../../utils/markdown-validation'
import { cleanPaste, headingsOf, insertBlock, linkCompletion, slashCompletion } from './codemirror'

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

describe('headingsOf', () => {
  it('lists ATX headings with their lines and skips code', async () => {
    const { markdown, markdownLanguage } = await import('@codemirror/lang-markdown')
    const { ensureSyntaxTree } = await import('@codemirror/language')
    const doc = '# 标题\n\n## 概览 ##\n\n```bash\n# 注释\n```\n\n### 细节\n'
    const state = EditorState.create({ doc, extensions: [markdown({ base: markdownLanguage })] })
    ensureSyntaxTree(state, state.doc.length, 5000)
    expect(headingsOf(state)).toEqual([
      { level: 1, text: '标题', line: 1 },
      { level: 2, text: '概览', line: 3 },
      { level: 3, text: '细节', line: 9 },
    ])
  })
})

describe('slashCompletion', () => {
  const complete = (doc: string) => {
    const state = EditorState.create({ doc })
    return slashCompletion(() => {})(new CompletionContext(state, doc.length, false))
  }

  it('opens only for a slash that starts a line', () => {
    expect(complete('/')!.options).toHaveLength(9)
    expect(complete('  /')!.from).toBe(2)
    expect(complete('见 /repair')).toBeNull()
    expect(complete('2026/11')).toBeNull()
  })

  it('filters by Chinese label or pinyin', () => {
    expect(complete('/代码')!.options.map(option => option.label)).toEqual(['代码块'])
    expect(complete('/biaoge')!.options.map(option => option.label)).toEqual(['表格'])
  })
})
