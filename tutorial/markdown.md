---
order: 13
maintainers:
  - user: m1ngsama
    since: 2026-09
---

# Markdown

弄清哪一套 Markdown 规则在管你写的文字，以及本站的检查会拦下什么。

## 概览

Markdown 由 John Gruber 在 2004 年提出，[原始说明](https://daringfireball.net/projects/markdown/syntax)附带一份 Perl 实现，但没有严格定义边界情形。各家实现对同一段文本给出不同结果，于是有了两层收敛。

- **[CommonMark](https://spec.commonmark.org/)** 把语法严格化并附带一整套测试用例，当前版本是 [0.31.2](https://spec.commonmark.org/0.31.2/)。
- **[GitHub Flavored Markdown](https://github.github.com/gfm/)** 在 CommonMark 之上加了表格、任务列表等四项扩展。

你按 CommonMark 加 GFM 理解就够，拿不准的地方以 CommonMark 规范为准。本站在这之上还有自己的扩展，那部分见 [VitePress](/tutorial/vitepress)。

## 基本语法

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

代码块用三个反引号包围，并且要标语言：

````md
```bash
pnpm install --frozen-lockfile
```
````

段落之间空一行。单个换行不产生新段落，这是从纯文本时代继承下来的行为。

## 强调的边界规则

这条是本站踩过的实际问题，值得单独讲。下面两行只差一个句号的位置，渲染结果完全不同：

| 写法             | 渲染结果               |
| ---------------- | ---------------------- |
| `**加粗。**后文` | 星号原样显示，没有变粗 |
| `**加粗**。后文` | 正常变粗               |

原因在 CommonMark 对[右侧界定符](https://spec.commonmark.org/0.31.2/#right-flanking-delimiter-run)的定义：

> A right-flanking delimiter run is a delimiter run that is (1) not preceded by Unicode whitespace, and either (2a) not preceded by a Unicode punctuation character, or (2b) preceded by a Unicode punctuation character and followed by Unicode whitespace or a Unicode punctuation character.

结尾的 `**` 前面是标点时，它后面就必须是空白或标点，否则不构成结束标记。开头的 `**` 有一条[对称的规则](https://spec.commonmark.org/0.31.2/#left-flanking-delimiter-run)。

用本仓库的 markdown-it 逐个试过，规律很清楚：

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

触发条件是标点落在强调的内侧边界上，而紧贴外侧的是普通字符。这不是中文特有的问题，`**bold.**after` 同样失效。中文里更常遇到，是因为中文标点后面通常不加空格。

避开的办法是把标点放到强调之外：写 `**加粗**。后文`，不写 `**加粗。**后文`。

渲染失败时源文件看起来完全正常，所以改完之后要扫一遍构建产物确认，方法见 [VitePress](/tutorial/vitepress#验证要看构建产物)。

## GFM 的四项扩展

以下几项不在 CommonMark 里，各自在 [GFM 规范](https://github.github.com/gfm/)中有独立章节。

**表格**（[规范](https://github.github.com/gfm/#tables-extension-)）用 `|` 分列，第二行用 `---` 分隔表头，冒号控制对齐：

```md
| 左对齐 | 居中 | 右对齐 |
| :----- | :--: | -----: |
| a      |  b   |      c |
```

**任务列表**（[规范](https://github.github.com/gfm/#task-list-items-extension-)）写作 `- [ ]` 与 `- [x]`。

**删除线**（[规范](https://github.github.com/gfm/#strikethrough-extension-)）写作 `~~文字~~`。

**自动链接**（[规范](https://github.github.com/gfm/#autolinks-extension-)）让裸露的网址自动变成链接。本站的检查会拦下裸链接，你要写成带方括号和圆括号的完整形式，或者用尖括号包起来。

## 转义与展示语法

要显示字面的 `*`、`_`、`#`、`` ` `` 这些符号，在前面加反斜杠。可转义的字符列在 [CommonMark 的反斜杠转义](https://spec.commonmark.org/0.31.2/#backslash-escapes)一节。

展示 Markdown 语法本身时，行内代码更省事，因为它里面的内容不受解析影响。要展示一整段带反引号的内容，外层用四个反引号包住三个反引号。

## 中文写作的两处约定

**引号一律用 `“”`。** 本站正文里 `“”` 出现一千五百多处，`「」` 一处也没有。行内引用英文原文时同样用 `“”`，不要让英文句子裸奔在中文里。

**`〔〕` 是编者按专用**，只在 `archived/` 下使用，且有特殊渲染行为，见 [VitePress](/tutorial/vitepress#本站的编者按标记)。

## 本站的检查会拦下什么

`pnpm run ci:lint` 跑 [markdownlint](https://github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md)。本站关掉了四条规则：行长度不限（MD013）、允许内联 HTML（MD033）、首行不必是标题（MD041）、强调符号风格不限（MD049）。

其余规则都开着。实测最常触发的是这九条：

| 规则  | 什么情况触发             | 怎么改                                     |
| ----- | ------------------------ | ------------------------------------------ |
| MD009 | 行尾有多余空格           | 删掉                                       |
| MD012 | 连续两个以上空行         | 只留一个                                   |
| MD022 | 标题上下没有空行         | 各空一行                                   |
| MD024 | 出现了内容相同的标题     | 换个说法                                   |
| MD025 | 一个文件里有多个一级标题 | 只留一个，其余降级                         |
| MD031 | 代码块上下没有空行       | 各空一行                                   |
| MD032 | 列表上下没有空行         | 各空一行                                   |
| MD034 | 直接写了裸网址           | 改成带方括号与圆括号的写法，或用尖括号包住 |
| MD040 | 代码块没标语言           | 补上，纯文本用 `text`                      |

多数问题能自动修：

```bash
pnpm run lint
```

它会就地改好格式，再跑 `pnpm run ci:lint` 确认。

## 延伸阅读

- [CommonMark 规范 0.31.2](https://spec.commonmark.org/0.31.2/)，附带可执行的测试用例
- [CommonMark 在线试验场](https://spec.commonmark.org/dingus/)，拿不准某种写法时直接试
- [GitHub Flavored Markdown 规范](https://github.github.com/gfm/)
- [markdownlint 规则说明](https://github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md)
- [John Gruber 的原始语法说明](https://daringfireball.net/projects/markdown/syntax)
