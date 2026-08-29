import type MarkdownIt from 'markdown-it'
import { noteRanges } from './editorial-note'

export function applyEditorialRules(md: MarkdownIt): void {
  // Only a whole paragraph in 〔〕 becomes a frame; mid-sentence notes read as asides.
  md.core.ruler.push('editorial_note', (state) => {
    const tokens = state.tokens
    const blocks: Array<{ type: string, text: string, open: number, close: number }> = []
    let depth = 0

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i]
      if (token.nesting === 1) {
        if (depth === 0)
          blocks.push({ type: token.type, text: '', open: i, close: i })
        depth++
      }
      else if (token.nesting === -1) {
        depth--
        if (depth === 0 && blocks.length)
          blocks[blocks.length - 1].close = i
      }
      else if (depth === 1 && token.type === 'inline' && blocks.length) {
        blocks[blocks.length - 1].text += token.content
      }
    }

    const textChild = (start: number, end: number, last: boolean) => {
      for (let i = last ? end : start; last ? i >= start : i <= end; last ? i-- : i++) {
        const children = tokens[i].type === 'inline' ? tokens[i].children ?? [] : []
        const texts = children.filter(child => child.type === 'text')
        if (texts.length)
          return last ? texts[texts.length - 1] : texts[0]
      }
      return undefined
    }

    for (const [from, to] of noteRanges(blocks).reverse()) {
      const head = textChild(blocks[from].open, blocks[from].close, false)
      const tail = textChild(blocks[to].open, blocks[to].close, true)
      const pending = head?.content.match(/^〔(待核实|待补充|待补)[：:]?/)

      if (head)
        head.content = head.content.replace(pending ? pending[0] : '〔', '')
      if (tail)
        tail.content = tail.content.replace(/〕(?=[^〕]*$)/, '')

      const after = new state.Token('html_block', '', 0)
      after.content = '</aside>\n'
      tokens.splice(blocks[to].close + 1, 0, after)

      const before = new state.Token('html_block', '', 0)
      before.content = pending
        ? `<aside class="nb-note is-pending" data-label="${pending[1]}">\n`
        : '<aside class="nb-note" data-label="编者">\n'
      tokens.splice(blocks[from].open, 0, before)
    }
  })

  const renderText = md.renderer.rules.text
    ?? ((tokens, idx) => md.utils.escapeHtml(tokens[idx].content))

  md.renderer.rules.text = (tokens, idx, options, env, self) => {
    return renderText(tokens, idx, options, env, self).replace(
      /〔(待核实|待补充|待补)([^〕]*)〕/g,
      (_, label, rest) =>
        `<span class="nb-pending"><span class="nb-pending-label">${label}</span>${rest}</span>`,
    )
  }
}
