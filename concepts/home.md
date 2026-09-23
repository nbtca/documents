---
maintainers:
  - user: m1ngsama
    since: 2026-09
---

# Home

Home 是 NBTCA 协会主页 [nbtca.space](https://nbtca.space) 的源码仓库，站名“拔电关机”，用 [Astro](https://docs.astro.build/) 构建。校内同学在这里[预约维修](https://nbtca.space/repair/create-ticket)，维修队员在这里的维修面板接单，成员博客、活动日历和纳新登记也都在这里。

<FactStrip :facts="[
  { label: '技术', value: 'Astro · React · Vue' },
  { label: '线上', value: 'nbtca.space' },
  { label: '始于', value: '2024 年' },
  { label: '维护', value: 'wen-templari' },
]" />

<Figure src="./assets/project-home.webp" alt="协会主页首页：顶部导航有博客、活动、维修、文档、关于我们，下方是博客文章卡片，头条是一篇讲提示词写法的文章" caption="首页按文章卡片排布，头条是最新置顶的博客。" date="2026-09" wide />

## 做什么

| 页面                                                        | 内容                                     | 数据来源                        |
| ----------------------------------------------------------- | ---------------------------------------- | ------------------------------- |
| [/](https://nbtca.space)、[/blog](https://nbtca.space/blog) | 成员博客，另有 RSS 和标签页              | 仓库里的 Markdown               |
| [/repair](https://nbtca.space/repair)                       | 报修、报修记录、工单详情、队员的维修面板 | [Saturday](./saturday)          |
| [/calendar](https://nbtca.space/calendar)                   | 活动日程，可一键订阅                     | [协会日历](./calendar-feeds)    |
| [/members](https://nbtca.space/members)                     | 按入学年份分组的成员列表                 | Saturday                        |
| [/join-us](https://nbtca.space/join-us)                     | 纳新介绍与新人信息登记                   | 纳新登记服务 active.nbtca.space |
| /graduation                                                 | 2024 年毕业典礼拍摄照片的下载页          | api.nbtca.space 上的静态文件    |

<Figure src="./assets/project-home-repair.webp" alt="主页维修板块的落地页：一幅蓝色线描插画，一位女生正在拆装电脑主机，下方写着“我们提供免费的电脑维修服务”和一个预约维修按钮" caption="维修板块的入口页，登录后即可预约；队员从同一板块进入维修面板。" date="2026-09" wide />

登录走 [NBTCA 账号](./nbtca-account)。站点只有中文。

## 技术栈

- **框架**：Astro 5，交互组件同时用 React 和 Vue，界面组件库是 [HeroUI](https://www.heroui.com/)，样式用 Tailwind CSS；
- **接口类型**：由 Saturday 的 OpenAPI 文档生成，存在 `src/types/saturday.d.ts`；本地开发时 `/saturday` 会代理到 `localhost:4000` 上的 Saturday；
- **部署**：推送到 `main` 后构建 nginx 镜像 `ghcr.io/nbtca/home` 并上线。PR 不会触发任何构建，合并前需要在本地跑一遍 `pnpm build`。

## 参与开发

```bash
git clone https://github.com/nbtca/Home.git
cd Home
pnpm install
pnpm dev
```

`pnpm build` 产出静态站点到 `dist/`，`pnpm lint` 跑 ESLint，拼写检查以警告形式混在其中。仓库目前没有测试。

**写一篇博客**不需要懂前端，完整流程见[撰写并发布你的第一篇 NBTCA 博客](/process/2025/nbtca-post)。要点：文章放在 `src/pages/posts/`，文件名用英文，图片放同级的 `_assets/`；开头的 frontmatter 照抄一篇现有文章，其中 `layout` 是相对路径，文章放得越深，前面的 `../` 越多。

**加一个页面**：在 `src/pages/` 下新建 `.astro` 文件，套上 `BaseLayout`；交互部分写成 React 或 Vue 组件，放进 `src/components/`，导航链接在 `HeaderNavigation.tsx` 的 `menuItems` 里加。

适合上手的任务：

- 把 `public/favicon.svg` 从 Astro 默认图标换成协会标志（[Home#118](https://github.com/nbtca/Home/issues/118)）；
- 页头的协会标志是一张 3475×3482、576 KB 的 PNG，每个页面都要加载，缩小并转成 WebP 或 SVG；
- 首页的文章切片 `slice(5, 11)` 之后接的是 `slice(12, 18)`，下标 11 的那篇文章永远不会出现；
- 把 `src/pages/` 下的 `.tsx` 组件移出去，消除构建时的 23 条警告；
- 把 README 从 Astro 模板改成真正的开发说明。

需要先讨论的：给 PR 加构建检查、从已弃用的 `Astro.glob` 迁到 content collections、改进加入表单（[Home#38](https://github.com/nbtca/Home/issues/38)）。

〔以上任务为**最后核对 2026-09** 时的状态。〕

主要维护者是 [wen-templari](https://github.com/wen-templari)，其他长期贡献者有 [LazuliKao](https://github.com/LazuliKao)、[m1ngsama](https://github.com/m1ngsama) 和 [zzh0u](https://github.com/zzh0u)。仓库地址：[github.com/nbtca/Home](https://github.com/nbtca/Home)。

## 沿革

- **2024 年 3 月**：仓库建立；5 月加入活动日历页，6 月加入毕业照下载，9 月加入纳新登记；
- **2025 年**：4 月起把报修从微信小程序搬到网页，5 月上线维修面板；10 月升级到 Astro 5，并发布博客投稿指南；12 月成员列表改为直接读取 Saturday；
- **2026 年**：活动日历支持点击订阅，成员持续投稿博客。

2023 年 10 月的[开发组规划](/archived/2023/developer/2023-10-dev-roadmap)里，“外网主页”还是一项待定工作：备案的公网服务器、海外服务器、Cloudflare Pages 或 GitHub Pages 静态托管三种方案都列了出来，前端框架也还在 Vue 3 和 React 之间。

主页上线后逐渐承担起更多事务。[2024 年 9 月 14 日的例会](/archived/2024/meetings/2024-09-14-online-meeting)鼓励成员学习 Git 与 Markdown，把自己的文章发到主页上，并指定了文章审核人；[2025 年 1 月的开发部例会](/archived/2025/2025-01-24-dev-meeting)提出在主页加一个“新年愿望”板块；[2025 年 10 月 11 日的例会](/archived/2025/2025-10-11-first-meeting)把新人在主页登记排进了迎新安排。[2026 年 9 月的百团招新安排会议](/archived/2026/2026-09-16-club-recruitment-fair-prep-meeting)安排教电竞社的同学用主页的维修网页接单，并引导新人在上面预约维修；同一次会上还有人建议在主页顶部加一条横幅，即时展示最新活动。

## 相关

其他项目见[基础设施与项目](/about/infrastructure)。
