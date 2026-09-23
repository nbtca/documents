---
maintainers:
  - user: m1ngsama
    since: 2026-09
---

# Saturday

Saturday 是 NBTCA 维修服务的后端 API，用 Go 编写，部署在 [api.nbtca.space](https://api.nbtca.space/docs)。报修、接单、提交、审核这些[维修工单系统](/repair/weekend)里的动作，最终都落在它的接口上。

## 做什么

- 管理维修事件的完整生命周期：创建、接受、放弃、提交审核、退回、关闭和指派，状态机见[维修工单系统](/repair/weekend)。
- 管理维修队成员和报修人，身份认证交给自建的 [Logto](https://docs.logto.io/)。
- 把维修事件推送到 [NSQ](https://nsq.io/) 消息队列，群机器人 [HuaJiBot.NET](./huajibot) 从这里取消息。
- 自动生成 [OpenAPI](https://spec.openapis.org/oas/latest.html) 文档，在线可看 [api.nbtca.space/docs](https://api.nbtca.space/docs)。

调用它的前端是协会主页 [Home](./home) 的[维修面板](https://nbtca.space/repair/admin)。早年的管理页 [Sunday](https://github.com/nbtca/Sunday) 和[报修小程序](./repair-miniprogram)也调用它，两者都已不再维护。

## 技术栈

- **语言与框架**：Go，HTTP 层用 [Huma v2](https://huma.rocks/) 搭在 [chi](https://go-chi.io/) 路由上，接口定义即文档；
- **数据库**：PostgreSQL，经 [sqlx](https://jmoiron.github.io/sqlx/) 访问，迁移脚本放在 `migrations/`，启动时自动执行；
- **配置**：环境变量或 `.env`，也可以从 Consul 读取，全部键名列在仓库 README；
- **部署**：推送到 `main` 后构建镜像 `ghcr.io/nbtca/saturday` 并自动上线。

## 参与开发

```bash
git clone https://github.com/nbtca/Saturday.git
cd Saturday
go test ./...
go run main.go
```

跑起服务需要一个 PostgreSQL 实例，配置样例见 `config.example.json`。CI 会依次检查 `gofmt`、`go vet` 和 `go test`，提交前在本地跑一遍这三项。

从 [open issues](https://github.com/nbtca/Saturday/issues) 入手，常见的需求来自维修队的实际使用，比如导出工单时的时长计算。前端要跟着改接口类型时，Home 仓库里的 `pnpm gen-type` 会从本地 Saturday（默认监听 4000 端口）的 OpenAPI 文档重新生成类型。

主要维护者是 [wen-templari](https://github.com/wen-templari)。仓库地址：[github.com/nbtca/Saturday](https://github.com/nbtca/Saturday)。

## 相关

- 用 AI 助手调用这套 API：[nbtca/skills](https://github.com/nbtca/skills) 收录了一个管理维修工单的 Agent Skill。
- 其他项目见[基础设施与项目](/about/infrastructure)。
