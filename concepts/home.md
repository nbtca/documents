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

## 相关

其他项目见[基础设施与项目](/about/infrastructure)。
