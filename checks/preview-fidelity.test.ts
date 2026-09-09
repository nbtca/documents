import { createMarkdownRenderer } from 'vitepress'
import { beforeAll, describe, expect, it } from 'vitest'
import siteConfig from '../.vitepress/config'
import { renderMarkdown } from '../utils/render-markdown'

// The editor previews a draft in the page itself. Only markdown -> HTML is
// reconstructed; components and styles are the site's own. This holds that one
// step to what the build publishes, so the preview cannot quietly start lying.
const FIXTURES: Array<[string, string]> = [
  ['heading', '# 维修操作指南\n\n## C盘清理'],
  ['emphasis', '第一原则是 **人身、财产和数据安全**，其次才是 *效率*。'],
  ['cjk bold beside punctuation', '清理按三层递进，**风险由低到高**：先清缓存。'],
  ['link', '见 [维修日](/repair/repair-day) 与 [CA101](/concepts/ca101)。'],
  ['list', '- 借教室\n- 报销流程\n- 活动组织'],
  ['ordered list', '1. 右键 C 盘\n2. 属性\n3. 磁盘清理'],
  ['tip container', ':::tip\n提前一周申请。\n:::'],
  ['titled container', ':::tip 提前规划\n借教室涉及多个审批环节。\n:::'],
  ['warning container', ':::warning\n分区操作前务必备份。\n:::'],
  ['info container', ':::info\n内部下载地址见软件仓库索引。\n:::'],
  ['editorial note', '〔编者〕这一段把两场活动接上了。〕'],
  ['pending marker', '这一处〔待核实 具体日期〕仍未确认。'],
  ['component passthrough', '<Figure src="./assets/a.webp" alt="现场" caption="说明" source="协会照片档案" />'],
  ['inline code', '执行 `powercfg /h off` 关闭休眠。'],
  ['blockquote', '> 活动不是给别人看的，是给自己协会的人办的。'],
  ['table', '| 项 | 值 |\n| --- | --- |\n| 维修日 | 一年十次 |'],
]

// Shiki runs in the build and loads on demand in the preview, so its markup is
// compared separately from the prose the writer is actually editing.
function withoutHighlighting(html: string): string {
  return html.replace(/<div class="language-[\s\S]*?<\/div>/g, '<!--code-->')
}

describe('preview fidelity', () => {
  let build: (source: string) => string

  beforeAll(async () => {
    const md = await createMarkdownRenderer(process.cwd(), siteConfig.markdown, '/')
    build = source => md.render(source)
  })

  it.each(FIXTURES)('renders %s the way the build does', (_name, source) => {
    expect(withoutHighlighting(renderMarkdown(source)))
      .toBe(withoutHighlighting(build(source)))
  })
})
