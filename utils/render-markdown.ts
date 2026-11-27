import type MarkdownIt from 'markdown-it'
import MarkdownItCtor from 'markdown-it'
import anchor from 'markdown-it-anchor'
import container from 'markdown-it-container'
import { applyEditorialRules } from './markdown-pipeline'

const CONTAINERS = ['tip', 'warning', 'info', 'danger', 'details'] as const

const DEFAULT_TITLE: Record<string, string> = {
  tip: 'TIP',
  warning: 'WARNING',
  info: 'INFO',
  danger: 'DANGER',
  details: 'Details',
}

const EXTERNAL = /^(?:[a-z][a-z\d+.-]*:)?\/\//i

function slugify(text: string): string {
  return String(text).trim().toLowerCase().replace(/\s+/g, '-')
}

function permalink(slug: string, _opts: unknown, state: any, index: number): void {
  const title = state.tokens[index + 1]?.content ?? ''
  const space = new state.Token('text', '', 0)
  space.content = ' '

  const open = new state.Token('link_open', 'a', 1)
  open.attrSet('class', 'header-anchor')
  open.attrSet('href', `#${slug}`)
  open.attrSet('aria-label', `Permalink to "${title}"`)

  const symbol = new state.Token('html_inline', '', 0)
  symbol.content = '&ZeroWidthSpace;'

  state.tokens[index + 1].children.push(space, open, symbol, new state.Token('link_close', 'a', -1))
}

function create(): MarkdownIt {
  const md = MarkdownItCtor({ html: true, linkify: true, breaks: false })

  // Encoding CJK hrefs here breaks every in-page anchor.
  md.normalizeLink = url => url
  md.normalizeLinkText = text => text

  md.use(anchor, { slugify, permalink, tabIndex: false })

  const heading = md.renderer.rules.heading_open
  md.renderer.rules.heading_open = (tokens, idx, options, env, self) => {
    tokens[idx].attrSet('tabindex', '-1')
    return heading ? heading(tokens, idx, options, env, self) : self.renderToken(tokens, idx, options)
  }

  md.renderer.rules.table_open = (tokens, idx, options, env, self) => {
    tokens[idx].attrSet('tabindex', '0')
    return self.renderToken(tokens, idx, options)
  }

  md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
    const href = tokens[idx].attrGet('href') ?? ''
    if (EXTERNAL.test(href)) {
      tokens[idx].attrSet('target', '_blank')
      tokens[idx].attrSet('rel', 'noreferrer')
    }
    else if (href.startsWith('/') && !href.includes('#') && !/\.\w+$/.test(href)) {
      tokens[idx].attrSet('href', `${href.replace(/\/$/, '/index')}.html`)
    }
    return self.renderToken(tokens, idx, options)
  }

  for (const name of CONTAINERS) {
    md.use(container, name, {
      render(tokens: any[], index: number) {
        const token = tokens[index]
        if (token.nesting !== 1)
          return name === 'details' ? '</details>\n' : '</div>\n'

        const title = token.info.trim().slice(name.length).trim() || DEFAULT_TITLE[name]
        return name === 'details'
          ? `<details class="details custom-block"><summary>${md.utils.escapeHtml(title)}</summary>\n`
          : `<div class="${name} custom-block"><p class="custom-block-title">${md.utils.escapeHtml(title)}</p>\n`
      },
    })
  }

  applyEditorialRules(md)
  return md
}

let renderer: MarkdownIt | undefined
let mapped: MarkdownIt | undefined

export function renderMarkdown(source: string): string {
  renderer ??= create()
  return renderer.render(source)
}

const VOID = /^(?:area|base|br|col|embed|hr|img|input|link|meta|source|track|wbr)$/i

// Net tags an HTML block leaves open. A component whose body has blank lines
// arrives as several blocks, and a marker between them would land in its slot.
function htmlDepth(html: string): number {
  let depth = 0
  for (const [tag, close, name, selfClosing] of html.matchAll(/<(\/)?([a-z][\w-]*)\b[^>]*?(\/)?>/gi)) {
    if (tag.startsWith('<!') || VOID.test(name) || selfClosing)
      continue
    depth += close ? -1 : 1
  }
  return depth
}

// The side preview scrolls with the editor by source line. A zero-size marker
// before each top-level block carries the line, because containers and raw
// HTML render markup that has nowhere to put an attribute.
export function renderMarkdownWithLines(source: string, offset = 0): string {
  if (!mapped) {
    mapped = create()
    mapped.core.ruler.push('source_line', (state) => {
      const tokens: typeof state.tokens = []
      let depth = 0
      let html = 0
      for (const token of state.tokens) {
        if (depth === 0 && html === 0 && token.nesting >= 0 && token.map && token.block) {
          const marker = new state.Token('html_block', '', 0)
          marker.content = `<i class="nb-line" data-line="${token.map[0] + 1 + state.env.offset}"></i>\n`
          tokens.push(marker)
        }
        if (depth === 0 && token.type === 'html_block')
          html = Math.max(0, html + htmlDepth(token.content))
        tokens.push(token)
        depth += token.nesting
      }
      state.tokens = tokens
    })
  }
  return mapped.render(source, { offset })
}
