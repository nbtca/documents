---
order: 13
maintainers:
  - user: m1ngsama
    since: 2026-09
---

# Markdown

本文讲 Markdown 的规范现状、常用语法，以及一条会让中文作者反复踩坑的强调边界规则。本站基于 VitePress，它在标准 Markdown 之上还有自己的扩展，那部分见 [VitePress](/tutorial/vitepress)。

## 先搞清楚有几套规范

Markdown 由 John Gruber 在 2004 年提出，[原始说明](https://daringfireball.net/projects/markdown/syntax)附带一份 Perl 实现，但没有严格定义边界情形。结果是各家实现对同一段文本给出不同结果。

后来出现两层收敛：

- **[CommonMark](https://spec.commonmark.org/)**：把语法严格化，附带一整套测试用例。当前版本是 [0.31.2](https://spec.commonmark.org/0.31.2/)。
- **[GitHub Flavored Markdown](https://github.github.com/gfm/)（GFM）**：在 CommonMark 之上加表格、任务列表、删除线等扩展。

写本站文档时按 CommonMark 加 GFM 理解即可，不确定的地方以 CommonMark 规范为准。

## 常用语法

| 写法                      | 结果            |
| ------------------------- | --------------- |
| `# 标题` 到 `###### 标题` | 一到六级标题    |
| `**粗体**`                | 粗体            |
| `*斜体*`                  | 斜体            |
| `` `代码` ``              | 行内代码        |
| `- 项` 或 `1. 项`         | 无序 / 有序列表 |
| `> 引用`                  | 引用块          |
| `---`                     | 分隔线          |

链接与图片：

```md
[显示的文字](/tutorial/markdown)
![给读不到图的人描述画面](./assets/example.webp)
```

站内链接以 `/` 开头写绝对路径。

代码块用三个反引号包围，并且**要标语言**，否则 markdownlint 的 MD040 会报错：

````md
```bash
pnpm install --frozen-lockfile
```
````

段落之间要空一行。单个换行不产生新段落——这是从纯文本时代继承下来的行为。

## 强调的边界规则

这条值得单独讲，因为它是本站踩过的实际问题。

先看现象。下面两行只差一个句号的位置：

| 写法             | 渲染结果                   |
| ---------------- | -------------------------- |
| `**加粗。**后文` | 星号原样显示，**没有**变粗 |
| `**加粗**。后文` | 正常变粗                   |

原因在 CommonMark 对[右侧界定符](https://spec.commonmark.org/0.31.2/#right-flanking-delimiter-run)的定义：

> A right-flanking delimiter run is a delimiter run that is (1) not preceded by Unicode whitespace, and either (2a) not preceded by a Unicode punctuation character, or (2b) preceded by a Unicode punctuation character and followed by Unicode whitespace or a Unicode punctuation character.

也就是说，结尾的 `**` 前面若是标点，它后面就必须是空白或标点，否则不构成结束标记。开头的 `**` 有一条[对称的规则](https://spec.commonmark.org/0.31.2/#left-flanking-delimiter-run)。

用本仓库的 markdown-it 实测，规律很清楚：

| 输入                   | 是否生效 |
| ---------------------- | -------- |
| `**加粗。**后文`       | 否       |
| `**加粗，**后文`       | 否       |
| `**加粗!**后文`        | 否       |
| `**bold.**after`       | 否       |
| `后文**。加粗**`       | 否       |
| `**加粗**。后文`       | 是       |
| `**加粗。** 后文`      | 是       |
| `**加粗。**、后文`     | 是       |
| `前文，**加粗**，后文` | 是       |

**触发条件是标点落在强调的内侧边界上，而紧贴外侧的是普通字符。** 这不是中文特有的问题，`**bold.**after` 同样失效；中文里更常遇到，是因为中文标点后面通常不加空格。

避开的办法：**把标点放到强调之外**。写 `**加粗**。后文`，不写 `**加粗。**后文`。

因为渲染失败时源文件看起来完全正常，改完之后应当扫一遍构建产物确认，方法见 [VitePress](/tutorial/vitepress#验证要看构建产物)。

## GFM 的扩展

以下几项不在 CommonMark 里，属于 [GFM](https://github.github.com/gfm/)：

- **表格**：用 `|` 分列，第二行用 `---` 分隔表头，可以用 `:` 控制对齐；
- **任务列表**：`- [ ]` 与 `- [x]`；
- **删除线**：`~~文字~~`；
- **自动链接**：裸露的网址会自动变成链接。不过本站的 markdownlint 规则 MD034 会拦下裸链接，请写成带方括号和圆括号的完整形式。

## 转义

要显示字面的 `*`、`_`、`#`、`` ` `` 等符号，在前面加反斜杠：`\*` 显示为 `*`。行内代码里的内容不受 Markdown 解析影响，展示语法时用它更省事。

## 延伸阅读

- [CommonMark 规范 0.31.2](https://spec.commonmark.org/0.31.2/)——附带可执行的测试用例
- [CommonMark 在线试验场](https://spec.commonmark.org/dingus/)——拿不准某种写法时直接试
- [GitHub Flavored Markdown 规范](https://github.github.com/gfm/)
- [John Gruber 的原始语法说明](https://daringfireball.net/projects/markdown/syntax)
