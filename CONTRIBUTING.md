# Contributing

计算机协会的公开文档站点。目标很简单：文档可读、链接不断、页面能被找到。写作与事实核查的标准见 [docs/editorial-standard.md](docs/editorial-standard.md)。

## 本地运行

需要 Node.js 22 与 pnpm 9。

```bash
pnpm install
pnpm docs:dev
```

## 内容放哪

- **指南**（`tutorial/` 与 `process/`）：教程与社务流程，共用一份边栏。新增页面后更新 `tutorial/sidebar.ts`。
- **维修 / 概念库 / 关于**（`repair/`、`concepts/`、`about/`）：枢纽模型，不挂边栏——从对应栏目的首页链接过去即可，其余靠站内词条链接与搜索抵达。
- **存档**（`archived/`）：历史材料，边栏自动扫描，通常无需改导航。保持历史原貌。

站内链接用以 `/` 开头的站内路径；移动或重命名页面时同步更新所有引用，别改已公开的 URL。

## 提交前

```bash
pnpm run ci:lint
pnpm test run
pnpm docs:build
```

提交信息用英文，遵循 Conventional Commits（`feat:` / `fix:` / `docs:` / `refactor:` 等）。源码注释用英文。

## PR

一个 PR 只做一件事——内容、导航、CI、资产尽量分开，便于审阅与回滚。PR 描述说明改了哪些栏目、是否动了导航或链接、跑过哪些验证。仓库有 PR 模板，按它填即可。
