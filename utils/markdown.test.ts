import { describe, expect, it } from 'vitest'
import { endWithNewline, extractH1, extractSummary, extractTitle, frontmatterValue, routeFromHref, splitFrontmatter, tidyBody } from './markdown'

const ORIGIN = 'https://docs.nbtca.space'

describe('route from href', () => {
  it('decodes percent-encoded paths', () => {
    expect(routeFromHref('/archived/2009/%E7%BB%B4%E4%BF%AE%E9%98%9F%E5%B7%A5%E4%BD%9C%E5%AE%88%E5%88%99.html', ORIGIN))
      .toBe('/archived/2009/维修队工作守则')
    expect(routeFromHref('/templates/event/volunteer%20recruitment.docx', ORIGIN))
      .toBe('/templates/event/volunteer recruitment.docx')
  })

  it('strips .html and collapses a trailing index', () => {
    expect(routeFromHref('/concepts/service-day.html', ORIGIN)).toBe('/concepts/service-day')
    expect(routeFromHref('/archived/index.html', ORIGIN)).toBe('/archived/')
  })

  it('ignores links that leave the site', () => {
    expect(routeFromHref('https://github.com/nbtca', ORIGIN)).toBeNull()
    expect(routeFromHref('mailto:contact@nbtca.space', ORIGIN)).toBeNull()
  })

  it('survives a malformed escape rather than throwing', () => {
    expect(routeFromHref('/archived/100%.html', ORIGIN)).toBe('/archived/100%')
  })
})

describe('page preview', () => {
  it('quotes the first prose paragraph', () => {
    const summary = extractSummary([
      '# 计算机协会',
      '',
      'NBTCA 是一个诞生于 2001 年的计算机社区。',
      '',
      '第二段不该出现。',
    ].join('\n'))

    expect(summary).toBe('NBTCA 是一个诞生于 2001 年的计算机社区。')
  })

  it('skips markdown directives instead of quoting them', () => {
    expect(extractSummary('# 计算机协会纲要\n\n[[toc]]\n')).toBe('')
    expect(extractSummary('# 纲要\n\n[[toc]]\n\n协会的组织与职责。')).toBe('协会的组织与职责。')
  })

  it('treats Chinese numbered lists as lists', () => {
    expect(extractSummary('# 线上会议\n\n1.开场：某人\n2.进度同步\n')).toBe('')
  })

  it('treats a bare dash as a list marker', () => {
    expect(extractSummary('# 例会\n\n-\n')).toBe('')
  })

  it('keeps decimals and dates out of the list rule', () => {
    expect(extractSummary('# 报告\n\n2024.09 起改用新流程。')).toBe('2024.09 起改用新流程。')
    expect(extractSummary('# 报价\n\n12.5 元一份。')).toBe('12.5 元一份。')
  })

  it('skips headings, code, containers and component tags', () => {
    const summary = extractSummary([
      '# 标题',
      '',
      '```sh',
      'echo not prose',
      '```',
      '',
      '::: tip',
      '容器里的内容',
      ':::',
      '',
      '<PageHero',
      '  title="标题"',
      '/>',
      '',
      '真正的首段。',
    ].join('\n'))

    expect(summary).toBe('真正的首段。')
  })

  it('strips inline markup and truncates', () => {
    expect(extractSummary('# T\n\n看 [文档](/a) 与 `code` 和 **粗体**。')).toBe('看 文档 与 code 和 粗体。')
    expect(extractSummary(`# T\n\n${'あ'.repeat(200)}`)).toHaveLength(141)
  })

  it('leaves no angle bracket behind, terminated or not', () => {
    expect(extractSummary('# T\n\n开头<b>加粗</b>结尾。')).toBe('开头加粗结尾。')
    expect(extractSummary('# T\n\n开头<<b>b>结尾。')).toBe('开头b结尾。')
    // No closing ">", so tag-stripping alone would leave this one intact.
    expect(extractSummary('# T\n\n开头<script结尾。')).toBe('开头script结尾。')
  })

  it('reads frontmatter overrides, quoted or bare', () => {
    expect(frontmatterValue('---\nsummary: 一句话定义。\n---\n', 'summary')).toBe('一句话定义。')
    expect(frontmatterValue('---\ntitle: "什么是 NBTCA"\n---\n', 'title')).toBe('什么是 NBTCA')
    expect(frontmatterValue('---\naside: false\n---\n', 'title')).toBeUndefined()
    expect(frontmatterValue('没有 frontmatter', 'title')).toBeUndefined()
  })
})

describe('page title', () => {
  it('falls back to the frontmatter title when the heading lives in a hero', () => {
    const hero = [
      '---',
      'title: 什么是 NBTCA',
      'aside: false',
      '---',
      '',
      '<PageHero title="什么是 NBTCA" />',
    ].join('\n')

    expect(extractH1(hero)).toBeUndefined()
    expect(extractTitle(hero)).toBe('什么是 NBTCA')
    expect(extractTitle('---\ntitle: Front\n---\n\n# Heading')).toBe('Heading')
  })

  it('extracts the first prose H1 and ignores fenced code', () => {
    const title = extractH1([
      '```sh',
      '# not a heading',
      '```',
      '',
      '# Real heading',
    ].join('\n'))

    expect(title).toBe('Real heading')
  })
})

describe('frontmatter split', () => {
  const PAGE = '---\nmaintainers:\n  - user: m1ngsama\n    since: 2026-07\n---\n\n# 维修日\n\n正文。\n'

  it('rejoins byte for byte', () => {
    const { head, body } = splitFrontmatter(PAGE)
    expect(head + body).toBe(PAGE)
  })

  it('hands the editor the body alone', () => {
    expect(splitFrontmatter(PAGE).body).toBe('\n# 维修日\n\n正文。\n')
  })

  it('stops at the opening block, not at a rule or a table in the body', () => {
    const withRules = `${PAGE}\n---\n\n| a | b |\n| --- | --- |\n| 1 | 2 |\n`
    const { head, body } = splitFrontmatter(withRules)
    expect(head).toBe('---\nmaintainers:\n  - user: m1ngsama\n    since: 2026-07\n---\n')
    expect(head + body).toBe(withRules)
  })

  it('leaves a page that has no frontmatter alone', () => {
    const plain = '# 只有正文\n\n没有 frontmatter。\n'
    expect(splitFrontmatter(plain)).toEqual({ head: '', body: plain })
  })

  it('treats an unterminated block as body rather than eating the page', () => {
    const broken = '---\nmaintainers:\n\n# 标题\n'
    expect(splitFrontmatter(broken)).toEqual({ head: '', body: broken })
  })
})

describe('file ending', () => {
  it('leaves a well-formed page alone', () => {
    expect(endWithNewline('# 标题\n\n正文。\n')).toBe('# 标题\n\n正文。\n')
  })

  it('adds the newline markdownlint requires', () => {
    expect(endWithNewline('# 标题\n\n正文。')).toBe('# 标题\n\n正文。\n')
  })

  it('collapses trailing blank lines rather than leaving them', () => {
    expect(endWithNewline('# 标题\n\n正文。\n\n\n  \n')).toBe('# 标题\n\n正文。\n')
  })
})

// A member cannot read the red check these rules produce on a pull request.
describe('tidying a body written in the browser', () => {
  it('collapses the blank run MD012 rejects', () => {
    expect(tidyBody('# 标题\n\n\n\n正文。\n')).toBe('# 标题\n\n正文。\n')
  })

  it('drops the stray trailing space MD009 rejects', () => {
    expect(tidyBody('正文。 \n下一行。\t\n')).toBe('正文。\n下一行。\n')
  })

  it('keeps a deliberate two-space hard break', () => {
    expect(tidyBody('上一行。  \n下一行。\n')).toBe('上一行。  \n下一行。\n')
  })

  it('leaves a page that was already clean byte for byte', () => {
    const page = '---\nmaintainers:\n  - user: m1ngsama\n---\n\n# 标题\n\n正文。\n'
    expect(tidyBody(page)).toBe(page)
  })
})
