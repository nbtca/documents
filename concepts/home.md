---
maintainers:
  - user: m1ngsama
    since: 2026-09
---

# Home

Home 是 NBTCA 协会主页 [nbtca.space](https://nbtca.space) 的源码仓库，用 [Astro](https://docs.astro.build/) 构建。校内同学在这里[预约维修](https://nbtca.space/repair/create-ticket)，维修队员在这里的[维修面板](https://nbtca.space/repair/admin)接单，成员博客也发布在这里。

## 做什么

- **维修**：报修表单、报修记录、工单详情和队员用的维修面板，数据都来自后端 [Saturday](./saturday)；
- **博客**：成员文章以 Markdown 放在 `src/pages/posts/`，投稿流程见[撰写并发布你的第一篇 NBTCA 博客](/process/2025/nbtca-post)；
- **日历**：[nbtca.space/calendar](https://nbtca.space/calendar) 读取[协会日历](./calendar-feeds)的订阅源，展示活动日程；
- **纳新与毕业**：新人信息登记页，以及 2024 年毕业典礼拍摄照片的下载页；
- **协会介绍**：关于、成员列表和加入我们。

## 技术栈

- **框架**：Astro 5，交互组件同时用 React 和 Vue，界面组件库是 [HeroUI](https://www.heroui.com/)，样式用 Tailwind CSS；
- **登录**：[Logto](https://docs.logto.io/) 浏览器 SDK，与 Saturday 共用一套账号；
- **接口类型**：由 Saturday 的 OpenAPI 文档生成，存在 `src/types/saturday.d.ts`；
- **部署**：推送到 `main` 后构建 nginx 镜像 `ghcr.io/nbtca/home`。

## 参与开发

```bash
git clone https://github.com/nbtca/Home.git
cd Home
pnpm install
pnpm dev
```

`pnpm build` 产出静态站点到 `dist/`，`pnpm lint` 跑 ESLint 和拼写检查。只改博客文章的话，照[博客投稿流程](/process/2025/nbtca-post)走即可，不需要懂前端。

Home 的 CI 只对仓库内分支提交的 PR 触发构建，从 fork 提交的 PR 合并后不会自动部署，所以成员最好直接在源仓库建分支。[open issues](https://github.com/nbtca/Home/issues) 里有换掉 Astro 默认 favicon、改进加入表单等适合上手的任务。

主要维护者是 [wen-templari](https://github.com/wen-templari)，贡献者还有 [LazuliKao](https://github.com/LazuliKao) 和 [m1ngsama](https://github.com/m1ngsama)。仓库地址：[github.com/nbtca/Home](https://github.com/nbtca/Home)。

## 沿革

2023 年 10 月的[开发组规划](/archived/2023/developer/2023-10-dev-roadmap)里，“外网主页”还是一项待定工作：备案的公网服务器、海外服务器、Cloudflare Pages 或 GitHub Pages 静态托管三种方案都列了出来，前端框架也还在 Vue 3 和 React 之间。

主页上线后逐渐承担起更多事务。[2024 年 9 月 14 日的例会](/archived/2024/meetings/2024-09-14-online-meeting)鼓励成员学习 Git 与 Markdown，把自己的文章发到主页上，并指定了文章审核人；[2025 年 1 月的开发部例会](/archived/2025/2025-01-24-dev-meeting)提出在主页加一个“新年愿望”板块；[2025 年 10 月 11 日的例会](/archived/2025/2025-10-11-first-meeting)把新人在主页登记排进了迎新安排。[2026 年 9 月的百团招新安排会议](/archived/2026/2026-09-16-club-recruitment-fair-prep-meeting)安排教电竞社的同学用主页的维修网页接单，并引导新人在上面预约维修；同一次会上还有人建议在主页顶部加一条横幅，即时展示最新活动。

## 相关

其他项目见[基础设施与项目](/about/infrastructure)。
