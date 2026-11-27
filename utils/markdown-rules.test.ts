import { describe, expect, it } from 'vitest'
import { codeParts, plainText, RULE_FIXES } from './markdown-rules'

describe('markdown rules', () => {
  it('splits code spans, including ones that contain backticks', () => {
    expect(codeParts('写成 `# 标题`，或 ```` ```bash ````。')).toEqual([
      { text: '写成 ', code: false },
      { text: '# 标题', code: true },
      { text: '，或 ', code: false },
      { text: '```bash', code: true },
      { text: '。', code: false },
    ])
  })

  it('leaves no stray backticks in any fix', () => {
    for (const fix of Object.values(RULE_FIXES))
      expect(codeParts(fix).filter(part => !part.code).some(part => part.text.includes('`'))).toBe(false)
  })

  it('reads as plain text for the editor', () => {
    expect(plainText(RULE_FIXES.MD018)).toBe('在井号和标题文字之间加一个空格，写成 # 标题。')
  })
})
