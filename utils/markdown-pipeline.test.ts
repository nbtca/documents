import { describe, expect, it } from 'vitest'
import { renderMarkdown } from './render-markdown'

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
