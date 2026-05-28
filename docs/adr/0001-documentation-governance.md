# ADR 0001: Documentation Governance Baseline

## Status

Accepted

## Date

2026-05-28

## Context

`nbtca/documents` 是协会文档站点，内容同时服务教程、流程、维修和历史存档。项目需要支持非开发者贡献 Markdown，也需要让维护者能稳定审阅导航、链接、附件和站点构建。

当前项目已经使用 VitePress、按栏目分目录，并通过 sidebar 配置组织站点结构。不同栏目使用了不同导航方式：教程、流程和维修手写 sidebar，存档自动扫描。这个状态可以工作，但需要明确治理边界，避免新增内容时不知道该改哪里。

## Decision

采用 VitePress 作为文档站点框架，继续以 Markdown 文件作为主要内容来源。

文档按栏目分目录：

- `tutorial/` 保存教程。
- `process/` 保存协会流程。
- `repair/` 保存维修相关文档。
- `archived/` 保存历史存档。

将 sidebar module 和 CI contract 作为治理 seam：

- sidebar module 负责把栏目内容暴露给站点导航。
- CI contract 负责在合并前验证格式、测试和站点构建。
- 贡献文档、项目上下文和 ADR 负责说明人应该如何提交和审阅变更。

这个决策不要求所有栏目立刻使用同一个导航实现，但要求每个栏目都能说明页面放置规则、导航更新位置和验证命令。后续可以在不改变栏目语义的前提下，逐步统一 sidebar 的实现接口。

## Consequences

贡献者新增页面时，需要同时考虑内容位置、导航入口、链接和构建验证。

维护者审阅 PR 时，可以用栏目边界、sidebar 变更和 CI 结果作为主要检查点，而不是只看 Markdown 是否能被渲染。

存档内容可以保留更宽松的历史结构，但活跃教程、流程和维修文档应逐步收敛到更明确的内容契约。

如果未来重构导航实现，应保持公开 URL 稳定，并把迁移写入新的 ADR 或更新本 ADR 的 superseded 状态。
