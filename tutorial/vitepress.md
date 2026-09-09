---
order: 7
maintainers:
  - user: m1ngsama
    since: 2026-09
---

# VitePress

弄清本站怎么把一堆 Markdown 变成一个网站，以及你能用上哪些标准语法之外的写法。

## 概览

本站用 [VitePress](https://vitepress.dev/) 构建，当前版本 1.6.4。它是 [Vite](https://vite.dev/) 加 Vue 的静态站点生成器，[把每个 Markdown 文件编译成一个页面](https://vitepress.dev/guide/routing)，网址就是它相对仓库根目录的路径。

| 文件                   | 网址                 |
| ---------------------- | -------------------- |
| `tutorial/markdown.md` | `/tutorial/markdown` |
| `tutorial/index.md`    | `/tutorial/`         |

由此得到两条实际约束。**文件名就是长期承诺的网址**，改名等于换网址，所以起名时要想清楚。站内链接一律以 `/` 开头写绝对路径，这样文件移动时更容易一次改全。

通用 Markdown 语法见 [Markdown](/tutorial/markdown)，仓库的协作规则见 [CONTRIBUTING.md](https://github.com/nbtca/documents/blob/main/CONTRIBUTING.md)，本文不重复。

## frontmatter

文件开头两行 `---` 之间的 YAML 是 [frontmatter](https://vitepress.dev/guide/frontmatter)，描述这一页而不显示在正文里。本站在此之上有自己的字段约定：

```yaml
---
order: 12 # 在侧栏分组里的位置，缺省则排到末尾
maintainers:
  - user: m1ngsama # GitHub 用户名，不带 @
    since: 2026-09 # YYYY-MM
---
```

`archived/` 下的页面用 `archive:` 代替 `maintainers:`，字段包括 `date`、`source`、`transcriber` 等。具体要求以仓库测试为准，缺字段或格式不对会让 CI 失败。

## 自定义容器

本站用得最多的扩展，语法是[自定义容器](https://vitepress.dev/guide/markdown#custom-containers)：

```md
::: tip 提示
内容
:::
```

可用类型有 `tip`、`info`、`warning`、`danger`、`details`。`details` 渲染成可折叠块，适合放篇幅长又不是人人要看的内容。冒号后面跟的文字是标题，省略则用默认标题。

## 代码块的几种写法

**代码组**（[文档](https://vitepress.dev/guide/markdown#code-groups)）把同一件事的多平台写法并排放进标签页，本站分平台的命令都用它：

````md
::: code-group

```bash [macOS]
brew install node@22
```

```powershell [Windows]
winget install OpenJS.NodeJS.LTS
```

:::
````

**行高亮**（[文档](https://vitepress.dev/guide/markdown#line-highlighting-in-code-blocks)）在语言后面写行号，例如 ` ```js{2,4-6} `。

**代码块内的增删标记**（[文档](https://vitepress.dev/guide/markdown#colored-diffs-in-code-blocks)）用 `// [!code ++]` 和 `// [!code --]` 注释，渲染成绿色和红色的行。

**从文件导入代码**（[文档](https://vitepress.dev/guide/markdown#import-code-snippets)）写作 `<<< @/path/to/file`，好处是代码不会随源文件更新而过时。

## 其它可用的扩展

| 写法                   | 效果                                                                               |
| ---------------------- | ---------------------------------------------------------------------------------- |
| `[[toc]]`              | 在该位置生成本页目录                                                               |
| `[^1]` 与 `[^1]: 说明` | [脚注](https://vitepress.dev/guide/markdown#footnotes)                             |
| `:tada:`               | [emoji](https://vitepress.dev/guide/markdown#emoji)                                |
| `> [!NOTE]`            | [GitHub 风格的提示块](https://vitepress.dev/guide/markdown#github-flavored-alerts) |
| ` ```mermaid `         | 流程图，本站通过插件启用                                                           |

Mermaid 适合表达流程、结构和时序，比纯文字清楚。不要为了配图而配图。

## 标题锚点

中文标题生成的锚点保留汉字，空格转连字符，英文转小写。例如 `## 代理相关的环境变量` 得到 `#代理相关的环境变量`，`## Git 的代理配置层级` 得到 `#git-的代理配置层级`。

跨页引用锚点前先确认实际生成的值，方法是构建之后从产物里取：

```bash
pnpm docs:build
grep -oE '<h2[^>]*id="[^"]+"' .vitepress/dist/tutorial/markdown.html
```

改标题会打断别处指向它的锚点链接。改之前先搜一遍谁在引用：

```bash
grep -rn 'tutorial/你改的那页#' tutorial/ archived/ about/ process/
```

`pnpm run ci:verify` 也会检查这类断链，但自己先查能省一轮返工。你也可以用 [`{#自定义锚点}`](https://vitepress.dev/guide/markdown#custom-anchors) 给标题固定一个不随标题文字变化的锚点。

## 本站的编者按标记

`archived/` 下用 `〔〕` 标注编者按，本站为它做了专门渲染。规则由 `utils/markdown-pipeline.ts` 实现。

**整段**以 `〔` 开头的段落会渲染成一个带“编者”标签的框：

```md
〔上面两份纪要都保留在本站。两者详略之别，正是这一节所指。〕
```

句子中间的 `〔〕` 不成框，按普通文字处理。

以 `〔待核实`、`〔待补充`、`〔待补` 开头的，渲染成带对应标签的待办标记，用来明确标出本站拒绝猜测的空缺：

```md
〔待核实：当时的具体人数原件未记。〕
```

这套标记只用于 `archived/`，正文页不要用。

## 本站自有组件

VitePress 允许[在 Markdown 里直接写 Vue 组件](https://vitepress.dev/guide/using-vue)。本站注册了十个，定义在 `.vitepress/theme/components.ts`：`Band`、`FactStrip`、`Figure`、`FigureGrid`、`LinkCard`、`LinkCards`、`PageHero`、`Split`、`Timeline`、`TimelineEntry`。

最常用的是 `Figure`，它比裸图片多出替代文字、图注与出处：

```md
<Figure src="../assets/example.webp" alt="给读不到图的人描述画面" caption="图注写图上看不见的信息" date="2026-09" source="协会照片档案" />
```

`alt` 写给读不到图的人，描述画面本身。`caption` 写图上看不见的信息，例如时间、场合、为什么值得看。两者不要重复。

图片一律用 WebP。本站开了[图片懒加载](https://vitepress.dev/guide/markdown#image-lazy-loading)，屏幕外的图不会立刻下载。写法与既有页面对齐即可，`concepts/` 和 `about/` 下有大量现成例子。

## 三个命令

| 命令                | 用途                                 |
| ------------------- | ------------------------------------ |
| `pnpm docs:dev`     | 开发服务器，改完即时刷新             |
| `pnpm docs:build`   | 生成 `.vitepress/dist/` 下的最终站点 |
| `pnpm docs:preview` | 起一个本地服务器托管上一步的产物     |

`docs:preview` 会先检查 `.vitepress/dist/` 是否存在，不存在就提示你先跑 `docs:build`。

## 验证要看构建产物

开发服务器和正式构建不是同一条流水线。dev 走即时编译，构建要经过打包、静态渲染、资源哈希这些步骤。只在构建产物里出问题的情况是真实存在的：

- 图片路径在 dev 下能显示，构建后指向不存在的文件；
- Markdown 写法在 dev 下渲染正常，构建后变成字面字符，见[强调的边界规则](/tutorial/markdown#强调的边界规则)；
- 组件在 dev 下工作，静态渲染时因为访问了浏览器 API 而失败。

所以判断依据是 `dist` 里的 HTML，不是 dev 服务器的页面：

```bash
pnpm docs:build
pnpm run ci:verify                    # 检查产物完整性与断链
grep -r "要确认的内容" .vitepress/dist/
```

推送前完整跑一遍：

```bash
pnpm run ci:lint
pnpm test -- --run
pnpm docs:build
pnpm run ci:verify
```

## 延伸阅读

- [VitePress 官方文档](https://vitepress.dev/)
- [VitePress 的 Markdown 扩展](https://vitepress.dev/guide/markdown)
- [在 Markdown 中使用 Vue](https://vitepress.dev/guide/using-vue)
- [Vite 官方文档](https://vite.dev/)
- [本仓库的 CONTRIBUTING.md](https://github.com/nbtca/documents/blob/main/CONTRIBUTING.md)
