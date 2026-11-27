import type { Configuration } from 'markdownlint'

// Kept apart from markdown-validation so the rule guide page can show this
// text without pulling markdownlint into the site bundle.
export const MARKDOWNLINT_CONFIG = {
  MD013: false,
  MD033: false,
  MD041: false,
  MD049: false,
} satisfies Configuration

// The submit path fixes these before opening a pull request, so flagging them
// would point at a line that is about to disappear and block a valid draft.
export const AUTO_FIXED = new Set(['MD009', 'MD012', 'MD047'])

export function ruleGuide(rule: string): string {
  return `/tutorial/markdown#${rule.toLowerCase()}`
}

export const RULE_MESSAGES: Record<string, string> = {
  MD001: '标题层级一次只能增加一级',
  MD003: '标题写法不一致',
  MD004: '无序列表使用的符号不一致',
  MD005: '同级列表项的缩进不一致',
  MD007: '嵌套列表的缩进不正确',
  MD009: '行尾有多余空格',
  MD010: '使用了制表符，请换成空格',
  MD011: '链接的方括号和圆括号写反了',
  MD012: '连续空行太多',
  MD014: '命令前的 $ 符号没有必要',
  MD018: '井号后需要空格',
  MD019: '标题的井号后只能有一个空格',
  MD020: '闭合式标题前后需要空格',
  MD021: '闭合式标题内只能有一个空格',
  MD022: '标题前后需要空行',
  MD023: '标题前不能有缩进',
  MD024: '有内容相同的标题',
  MD025: '一页只能有一个一级标题',
  MD026: '标题末尾不能有标点',
  MD027: '引用符号后只能有一个空格',
  MD028: '引用块之间不能直接留空行',
  MD029: '有序列表的编号不一致',
  MD030: '列表标记后只能有一个空格',
  MD031: '代码块前后需要空行',
  MD032: '列表前后需要空行',
  MD033: '这里不允许直接写 HTML',
  MD034: '裸网址需要写成链接或放进尖括号',
  MD035: '分隔线的写法不一致',
  MD036: '不要用强调代替标题',
  MD037: '强调标记内部不能多出空格',
  MD038: '行内代码标记内部不能多出空格',
  MD039: '链接文字两边不能多出空格',
  MD040: '代码块需要标明语言',
  MD041: '第一行应该是一级标题',
  MD042: '链接地址不能为空',
  MD043: '标题结构不符合约定',
  MD044: '专有名词的大小写不一致',
  MD045: '图片缺少替代文字',
  MD046: '代码块风格不一致',
  MD047: '文件末尾只能有一个换行',
  MD048: '代码围栏的符号不一致',
  MD049: '强调符号的风格不一致',
  MD050: '加粗符号的风格不一致',
  MD051: '站内链接的锚点不存在',
  MD052: '引用链接或图片没有对应定义',
  MD053: '链接定义没有被使用',
  MD054: '链接或图片的写法不一致',
  MD055: '表格行格式不一致',
  MD056: '表格列数不一致',
  MD058: '表格前后需要空行',
  MD059: '链接文字没有说明去向',
  MERMAID: 'Mermaid 图表语法错误',
  FENCE: '代码块没有关闭',
  CONTAINER: '容器标记没有配对',
}

// Code spans use Markdown backticks; a run of four marks a span that
// itself contains ```.
export const RULE_FIXES: Record<string, string> = {
  MD001: '把这个标题的井号减少到只比上一级标题多一个，例如二级标题下面用 `###` 而不是 `####`。',
  MD003: '全文统一用行首井号的写法写标题，例如 `## 标题`。',
  MD004: '把这一组列表的开头符号统一成 `-`。',
  MD005: '让同一级的列表项左边对齐，删掉多出来的空格。',
  MD007: '子列表比上一级多缩进两个空格即可。',
  MD010: '删掉这一行里的 Tab，改用空格缩进。',
  MD011: '把方括号和圆括号对调，写成 `[链接文字](网址)`。',
  MD014: '如果代码块只有命令没有输出，就删掉每行开头的 `$` 和空格。',
  MD018: '在井号和标题文字之间加一个空格，写成 `# 标题`。',
  MD019: '把井号后面的多个空格删到只剩一个。',
  MD020: '在开头和结尾的井号与文字之间各留一个空格，或者删掉结尾的井号。',
  MD021: '把井号和文字之间的多个空格删到只剩一个。',
  MD022: '在这个标题的上一行和下一行各留一个空行。',
  MD023: '删掉标题前面的空格，让井号顶格写。',
  MD024: '修改其中一个标题的文字，让同一页的标题互不重复。',
  MD025: '整页只保留一个 `#` 开头的标题，其余改成 `##` 或更低的级别。',
  MD026: '删掉标题末尾的句号、冒号等标点。',
  MD027: '把 `>` 后面的多个空格删到只剩一个。',
  MD028: '如果是同一段引用，就在空行里补上 `>`；如果是两段引用，就在中间写一句正文隔开。',
  MD029: '有序列表可以都写 `1.`，也可以按 `1.` `2.` `3.` 顺序编号，但不要混用。',
  MD030: '把列表符号后面的多个空格删到只剩一个。',
  MD031: '在代码块开头的 ```` ``` ```` 上方和结尾的 ```` ``` ```` 下方各留一个空行。',
  MD032: '在列表的第一项上方和最后一项下方各留一个空行。',
  MD034: '把网址写成 `[链接文字](网址)`，或者用尖括号包起来写成 `<网址>`。',
  MD035: '全文的分隔线统一写成 `---`。',
  MD036: '如果这一行是标题，就把 `**` 换成 `##` 开头的标题写法。',
  MD037: '删掉 `*` 或 `**` 与文字之间的空格，写成 `**重点**`。',
  MD038: '删掉反引号和代码之间多出来的空格。',
  MD039: '删掉方括号里文字两边的空格，写成 `[文字](网址)`。',
  MD040: '在开头的 ```` ``` ```` 后面写上语言名，例如 ```` ```bash ````；不确定时写 ```` ```text ````。',
  MD042: '在圆括号里填上链接地址，或者删掉这个链接。',
  MD044: '按规定的大小写改写这个名称。',
  MD045: '在图片的方括号里写一句描述，写成 `![图片内容](地址)`。',
  MD046: '全文的代码块统一用 ```` ``` ```` 包起来，不要只靠缩进。',
  MD048: '全文的代码块统一用 ```` ``` ```` 作为开头和结尾。',
  MD050: '加粗统一写成 `**文字**`。',
  MD051: '检查 `#` 后面的锚点是否和目标标题一致，或者删掉这个锚点。',
  MD052: '在页面末尾补上 `[名称]: 网址` 的定义，或者改成普通的 `[文字](网址)` 链接。',
  MD053: '删掉这一行没有被引用的链接定义。',
  MD054: '链接统一写成 `[文字](网址)`。',
  MD055: '让表格每一行的开头和结尾都写上 `|`，或者都不写。',
  MD056: '让这一行的 `|` 数量与表头一致，缺内容的格子可以留空。',
  MD058: '在表格的上一行和下一行各留一个空行。',
  MD059: '把“这里”“点击这里”这类链接文字换成能说明去向的文字，例如 `[报修流程](网址)`。',
  MERMAID: '检查这一行的括号、箭头和引号是否写全。拿不准时先删掉这一行，确认错误消失后再逐步加回来。',
  FENCE: '在代码结束的地方另起一行，写上和开头相同的 ```` ``` ````。',
  CONTAINER: '每个 `::: tip` 这样的开头都需要在内容结束后另起一行写 `:::` 作为结尾，多余的 `:::` 可以删掉。',
}

const CODE_SPAN = /````\s(.+?)\s````|`([^`]+)`/g

export function codeParts(text: string): { text: string, code: boolean }[] {
  const parts: { text: string, code: boolean }[] = []
  let last = 0
  for (const match of text.matchAll(CODE_SPAN)) {
    if (match.index > last)
      parts.push({ text: text.slice(last, match.index), code: false })
    parts.push({ text: match[1] ?? match[2], code: true })
    last = match.index + match[0].length
  }
  if (last < text.length)
    parts.push({ text: text.slice(last), code: false })
  return parts
}

export function plainText(text: string): string {
  return codeParts(text).map(part => part.text).join('')
}
