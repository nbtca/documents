# Contributing

计算机协会的公开文档站点。目标很简单：文档可读、链接不断、页面能被找到。

## 本地运行

需要 Node.js 22 与 pnpm 9。

```bash
pnpm install
pnpm docs:dev
```

## 仓库结构

```text
about/ concepts/ repair/ process/ tutorial/ archived/   content + assets/
public/                                                 fixed URLs

.vitepress/config.mts   site config
.vitepress/sidebars/    sidebars
.vitepress/theme/       components, styles
utils/                  build-time modules
checks/                 contracts, asset manifest, dist verifier
```

## 内容放哪

- **指南**（`tutorial/` 与 `process/`）：教程与社务流程，共用一份边栏。新增页面后更新 `.vitepress/sidebars/guide.ts`。
- **关于**（`about/`）：有独立边栏（`.vitepress/sidebars/about.ts`），新增页面后同步更新。
- **维修 / 概念库**（`repair/`、`concepts/`）：枢纽模型，不挂边栏——从对应栏目的首页链接过去即可，其余靠站内词条链接与搜索抵达。
- **存档**（`archived/`）：历史材料，边栏自动扫描，通常无需改导航。保持历史原貌。

站内链接用以 `/` 开头的站内路径；移动或重命名页面时同步更新所有引用，别改已公开的 URL。

## 每页都要写维护人

`archived/` 以外的每个页面，都在 frontmatter 里声明谁在维护它——读者知道找谁问，接手的人知道这页归谁。测试会拦住漏写和写错格式的页面。

```yaml
---
maintainers:
  - user: m1ngsama # GitHub 用户名，不带 @
    since: 2026-07 # YYYY-MM；只是被指派、没有接手日期时可省略
---
```

多人维护就并列多条。存档页不写这个：它们的来历记在 `archive:` 里，其中 `transcriber` 是转写者。

## 提交前

```bash
pnpm run ci:lint
pnpm test run
pnpm docs:build
pnpm run ci:verify
```

提交信息用英文，遵循 Conventional Commits（`feat:` / `fix:` / `docs:` / `refactor:` 等）。源码注释用英文。

## PR

一个 PR 只做一件事——内容、导航、CI、资产尽量分开，便于审阅与回滚。PR 描述说明改了哪些栏目、是否动了导航或链接、跑过哪些验证。仓库有 PR 模板，按它填即可。
