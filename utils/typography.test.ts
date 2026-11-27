import { describe, expect, it } from 'vitest'
import { typographyHints } from './typography'

const fixes = (source: string) => typographyHints(source).map(hint => [hint.message, hint.fixInfo.insertText])

describe('typographyHints', () => {
  it('asks for a space between Han and Latin text', () => {
    expect(fixes('使用Git管理')).toEqual([
      ['中文和英文、数字之间通常空一格', ' '],
      ['中文和英文、数字之间通常空一格', ' '],
    ])
  })

  it('spaces numbers the way the site already does', () => {
    expect(typographyHints('2010 年 10 月 5 日，占 5%')).toEqual([])
    expect(typographyHints('共30人')).toHaveLength(2)
  })

  it('turns corner quotes into the site quotes', () => {
    expect(fixes('别只写「维修工具」')).toEqual([
      ['本站引号统一用 “” 和 ‘’', '“'],
      ['本站引号统一用 “” 和 ‘’', '”'],
    ])
  })

  it('asks for full-width punctuation inside Chinese', () => {
    expect(fixes('先备份,再重装')).toEqual([['中文句子里用全角标点', '，']])
  })

  it('narrows full-width digits and letters', () => {
    expect(fixes('第１２３号')).toEqual([['数字和英文字母用半角', '123']])
  })

  it('normalises ellipses', () => {
    expect(fixes('等等。。。')).toEqual([['省略号写成 ……', '……']])
  })

  it('ignores code, link targets, tags, and URLs', () => {
    const source = '运行 `git status查看`\n\n```bash\necho 中文abc\n```\n\n[链接](/repair/中文a)\n\n<Figure alt="中文a" />\n\nhttps://x.cn/中文a\n'
    expect(typographyHints(source)).toEqual([])
  })

  it('reports columns that point at the original text', () => {
    const [hint] = typographyHints('`a`  使用Git')
    expect(hint).toMatchObject({ line: 1, column: 8, length: 0 })
  })
})
