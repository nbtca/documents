import { describe, expect, it } from 'vitest'
import { renderMarkdown, renderMarkdownWithLines } from './render-markdown'

describe('task lists', () => {
  it('renders open and done items as checkboxes', () => {
    const html = renderMarkdown('- [ ] 场地\n- [x] 时间\n')
    expect(html).toContain('<li class="nb-task"><input type="checkbox"> 场地</li>')
    expect(html).toContain('<li class="nb-task"><input type="checkbox" checked> 时间</li>')
  })

  it('leaves brackets alone outside the start of a list item', () => {
    expect(renderMarkdown('- 选 [ ] 或 [x]\n\n[ ] 段落\n')).not.toContain('checkbox')
  })
})

describe('renderMarkdownWithLines', () => {
  const lines = (html: string) => [...html.matchAll(/data-line="(\d+)"/g)].map(match => Number(match[1]))

  it('marks each top-level block with its source line', () => {
    expect(lines(renderMarkdownWithLines('# T\n\npara\n\n- a\n- b\n\n::: tip\nx\n:::\n'))).toEqual([1, 3, 5, 8])
  })

  it('shifts lines past stripped front matter', () => {
    expect(lines(renderMarkdownWithLines('# T\n', 4))).toEqual([5])
  })

  it('keeps markers out of a component split by blank lines', () => {
    const html = renderMarkdownWithLines('<FigureGrid>\n\n<Figure src="a" />\n\n<Figure src="b" />\n\n</FigureGrid>\n\nAfter\n')
    expect(lines(html)).toEqual([1, 9])
  })

  it('renders the same markup apart from the markers', () => {
    const source = '# T\n\n- a\n\n::: tip\nx\n:::\n'
    expect(renderMarkdownWithLines(source).replace(/<i class="nb-line"[^>]*><\/i>\n/g, '')).toBe(renderMarkdown(source))
  })
})
