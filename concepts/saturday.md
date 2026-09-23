---
maintainers:
  - user: m1ngsama
    since: 2026-09
---

# Saturday

Saturday 是 NBTCA 维修服务的后端 API，用 Go 编写，部署在 [api.nbtca.space](https://api.nbtca.space/docs)。报修、接单、提交、审核这些[维修工单系统](/repair/weekend)里的动作，最终都落在它的接口上；截至 2026 年 9 月，它累计记录了七百多张维修工单。

<FactStrip :facts="[
  { label: '技术', value: 'Go · PostgreSQL' },
  { label: '线上', value: 'api.nbtca.space' },
  { label: '始于', value: '2021 年' },
  { label: '维护', value: 'wen-templari' },
]" />

<Figure src="./assets/project-saturday-api-docs.webp" alt="Saturday 在线接口文档中的“Commit event”页：左侧列出 Event 分组下的全部接口，中间是 POST 请求地址 /member/events/{EventId}/commit 和请求体字段 content、size，右侧是可以直接发送的请求面板和 curl 示例" caption="队员提交维修记录调用的就是这个接口，请求体里的 size 即工作量分档。接口文档由代码自动生成，不登录也能查看。" date="2026-09" wide />

## 做什么

一张工单从创建到结束，只能沿下面这些动作走，状态机写在 `util/event-action.go`：

| 动作        | 谁能做       | 状态变化                                  |
| ----------- | ------------ | ----------------------------------------- |
| create      | 报修人       | 新建 → 待接单                             |
| cancel      | 该单报修人   | 待接单 → 已取消                           |
| update      | 该单报修人   | 待接单时修改联系方式和问题描述            |
| accept      | 队员、管理员 | 待接单 → 已接单                           |
| drop        | 接单的队员   | 已接单 → 待接单                           |
| commit      | 接单的队员   | 已接单 → 待审核，同时填写维修记录和工作量 |
| alterCommit | 接单的队员   | 审核前修改维修记录                        |
| reject      | 管理员       | 待审核 → 已接单，退回重做                 |
| close       | 管理员       | 待审核 → 已完成                           |

- **身份**：所有登录的人都是报修人；在 [NBTCA 账号](./nbtca-account)里拥有“Repair Member”或“Repair Admin”角色的，同时是队员或管理员；
- **隐私**：队员接单之后才能看到报修人的电话和 QQ；
- **通知**：每个动作都会按成员自己的通知偏好发邮件，并向 [NSQ](https://nsq.io/) 消息队列发一条消息，群机器人 [HuaJiBot.NET](./huajibot) 订阅这些消息推送到维修队群里；
- **导出**：管理员可以按日期导出 Excel，里面有每人工时汇总和工单明细，工时规则见[维修工单系统](/repair/weekend)。

## 架构

分层清楚，新人建议按这个顺序读：`main.go` 读配置、启动服务 → `router/main.go` 路由表 → `util/event-action.go` 状态机 → `service/event.go` 里的 `Act`，一个动作的校验、落库、通知都在这里 → `repo/event.go` 数据库访问 → `middleware/huma_helpers.go` 登录与角色。

- **HTTP 层**：[Huma v2](https://huma.rocks/) 搭在 [chi](https://go-chi.io/) 路由上，接口定义即文档，`/docs` 与 `/openapi.json` 自动生成；
- **数据库**：PostgreSQL，经 [sqlx](https://jmoiron.github.io/sqlx/) 访问，`migrations/` 里的迁移脚本在启动时自动执行；
- **配置**：环境变量或 `.env`，键名把点换成下划线，例如 `db.dataSource` 对应 `DB_DATASOURCE`；生产环境从 Consul 读取，每 5 秒刷新一次；
- **部署**：推送到 `main` 后构建镜像 `ghcr.io/nbtca/saturday`。

## 参与开发

本地只需要一个 PostgreSQL，Logto、邮件、NSQ、GitHub 这些外部服务都可以不配：

```bash
git clone https://github.com/nbtca/Saturday.git
cd Saturday
go test ./...
createdb saturday
DB_DATASOURCE='postgres://postgres@127.0.0.1:5432/saturday?sslmode=disable' go run .
curl localhost:4000/ping
```

`go test` 不需要数据库。服务起来后打开 `http://localhost:4000/docs` 就能看到本地的接口文档。CI 会依次检查 `gofmt`、`go vet` 和 `go test`。

几处容易踩的坑：端口读的是 `PORT`，仓库 README 里写的 `SERVER_PORT` 不生效；`config.example.json` 只是 Consul 配置的样例，本地不会读取；仓库里的 `docker-compose.yaml` 还停留在 MySQL 时代，不能直接用。

适合上手的任务：

- 修正 README 的配置表，写一份带 PostgreSQL 的 `docker-compose.yaml`，让新人一条命令跑起来；
- 给 `repo/` 和 `router/` 补测试，这两个包目前没有测试，工时换算这类纯函数最好写；
- 清理导出表格里始终为空的 GitHub Issue 列。

需要先和维护者讨论的：工单增加“联系不上、无需维修”一类的结束状态（[Saturday#214](https://github.com/nbtca/Saturday/issues/214)），调整工时计算规则（[Saturday#215](https://github.com/nbtca/Saturday/issues/215)），以及队员入队流程（[Saturday#177](https://github.com/nbtca/Saturday/issues/177)）。

〔以上坑点与任务为**最后核对 2026-09** 时的状态。〕

## 沿革

- **2021 年 8 月**：第一版用 Node.js、Express 和 MySQL 写成，还内置了一个 QQ 机器人；
- **2022 年 4 月**：用 Go 重写，也就是现在的主分支。同期的管理页 [Sunday](https://github.com/nbtca/Sunday) 和报修小程序 Hawaii 与它合称 weekend 项目；
- **2023 年 11 月**：接入 Logto 登录；
- **2024 年 4 月**：数据库从 MySQL 换成 PostgreSQL；
- **2025 年**：2 月起尝试把工单同步到 GitHub Issue，4 月加入邮件通知，5 月加入工作量分档和 Excel 导出，7 月 HTTP 层从 Gin 迁到 Huma；
- **2026 年 9 月**：修复全新数据库迁移失败、Logto webhook 验签等问题。

存档里也有它的身影。2023 年 10 月的[开发组新人学习路线](/archived/2023/developer/2023-10-newcomer-training)把“接手学长的 weekend 项目后端”列为新人入口之一，同期的[开发组规划](/archived/2023/developer/2023-10-dev-roadmap)把迁移维修报修后端的服务器和数据列为待办。[2025 年 1 月的部长会议](/archived/2025/2025-01-25-officers-meeting)总结维修日时，提议给维修事件加上工单号作唯一标识，并在报修单上增加问题类型勾选，方便做简单的数据聚类。

## 相关

- 调用它的前端是协会主页 [Home](./home) 的维修页面。旧管理页 Sunday 仍部署在 repair.nbtca.space，页面顶部提示前往新地址；[报修小程序](./repair-miniprogram)已停用。
- 用 AI 助手调用这套 API：[nbtca/skills](https://github.com/nbtca/skills) 收录了一个管理维修工单的 Agent Skill。
- 其他项目见[基础设施与项目](/about/infrastructure)。
