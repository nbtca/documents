---
order: 13
maintainers:
  - user: m1ngsama
    since: 2026-09
---

# VitePress

本站由 [VitePress](https://vitepress.dev/) 构建，当前版本 1.6.4。本文讲它的路由模型、frontmatter、在标准 Markdown 之上的扩展语法、本站自有组件，以及三个构建命令的分工。通用 Markdown 语法见 [Markdown](/tutorial/markdown)，仓库的协作规则见 [CONTRIBUTING.md](https://github.com/nbtca/documents/blob/main/CONTRIBUTING.md)，本文不重复。

## 路由由文件路径决定

VitePress 是 [Vite](https://vite.dev/) 加 Vue 的静态站点生成器，[把每个 Markdown 文件编译成一个页面](https://vitepress.dev/guide/routing)，网址就是它相对仓库根目录的路径。

| 文件                   | 网址                 |
| ---------------------- | -------------------- |
| `tutorial/markdown.md` | `/tutorial/markdown` |
| `tutorial/index.md`    | `/tutorial/`         |

由此得到两条实际约束：**文件名就是长期承诺的网址**，改名等于换网址；站内链接以 `/` 开头写绝对路径，不要写相对路径，这样文件移动时更容易一次改全。

## frontmatter

文件开头用两行 `---` 夹起来的 YAML 是 [frontmatter](https://vitepress.dev/guide/frontmatter)，用于描述这一页而不显示在正文里。本站在此基础上有自己的字段约定：

```yaml
---
order: 12 # 在侧栏分组里的位置，缺省则排到末尾
maintainers:
  - user: m1ngsama # GitHub 用户名，不带 @
    since: 2026-09 # YYYY-MM
---
```

`archived/` 下的页面用 `archive:` 代替 `maintainers:`。具体要求以仓库测试为准，缺字段或格式不对会让 CI 失败。

## Markdown 扩展

在标准语法之外，VitePress 还支持这些：

**[自定义容器](https://vitepress.dev/guide/markdown#custom-containers)**，本站用得最多：

```md
::: tip 提示
内容
:::
```

可用的类型有 `tip`、`warning`、`danger`、`info`、`details`。

**页面目录**，在想要的位置写 `[[toc]]`，自动列出本页标题。

**[代码组](https://vitepress.dev/guide/markdown#code-groups)**，把同一件事的多种写法并排放在标签页里：

````md
::: code-group

```bash [macOS]
brew install node@22
```

```powershell [Windows]
scoop install nodejs-lts
```

:::
````

**[代码行高亮](https://vitepress.dev/guide/markdown#line-highlighting-in-code-blocks)**，在语言后面写行号，如 ` ```js{2,4-6} `。

**Mermaid 图**，本站通过插件启用，写 ` ```mermaid ` 代码块即可。流程、结构、时序用它比纯文字清楚，但不要为了配图而配图。

**[自定义锚点](https://vitepress.dev/guide/markdown#custom-anchors)**，中文标题默认生成的锚点是把标题里的汉字保留、空格转连字符，例如 `## 代理相关的环境变量` 得到 `#代理相关的环境变量`。跨页引用锚点前，最好确认一下实际生成的值。

## 本站自有组件

VitePress 允许[在 Markdown 里直接写 Vue 组件](https://vitepress.dev/guide/using-vue)。本站注册了十个，定义在 `.vitepress/theme/components.ts`：`Band`、`FactStrip`、`Figure`、`FigureGrid`、`LinkCard`、`LinkCards`、`PageHero`、`Split`、`Timeline`、`TimelineEntry`。

最常用的是 `Figure`，它比裸图片多出替代文字、图注与出处：

```md
<Figure src="../assets/example.webp" alt="给读不到图的人描述画面" caption="图注写图上看不见的信息" date="2026-09" source="协会照片档案" />
```

图片一律用 WebP。写法与既有页面对齐即可，`concepts/` 和 `about/` 下有大量现成例子。

## 三个命令

| 命令                | 用途                                 |
| ------------------- | ------------------------------------ |
| `pnpm docs:dev`     | 开发服务器，改完即时刷新             |
| `pnpm docs:build`   | 生成 `.vitepress/dist/` 下的最终站点 |
| `pnpm docs:preview` | 起一个本地服务器托管上一步的产物     |

`docs:preview` 会先检查 `.vitepress/dist/` 是否存在，不存在就提示先跑 `docs:build`。

## 验证要看构建产物

开发服务器和正式构建**不是同一条流水线**。dev 走的是即时编译，构建则要经过打包、静态渲染、资源哈希这些步骤。只有构建产物出问题的情况是真实存在的，例如：

- 图片路径在 dev 下能显示，构建后指向不存在的文件；
- Markdown 写法在 dev 下渲染正常，构建后变成字面字符；
- 组件在 dev 下工作，静态渲染时因为访问了浏览器 API 而失败。

所以改完之后，判断依据是 `dist` 里的 HTML，不是 dev 服务器的页面：

```bash
pnpm docs:build
pnpm run ci:verify          # 检查产物的完整性
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
- [VitePress Markdown 扩展](https://vitepress.dev/guide/markdown)
- [Vite 官方文档](https://vite.dev/)
- [本仓库的 CONTRIBUTING.md](https://github.com/nbtca/documents/blob/main/CONTRIBUTING.md)
