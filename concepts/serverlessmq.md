---
maintainers:
  - user: m1ngsama
    since: 2026-09
---

# ServerlessMQ

ServerlessMQ 是 NBTCA 自建的消息中转服务，跑在 Cloudflare Workers 上，部署在 mq.nbtca.space 和 webhook.nbtca.space 两个地址。它把发往某个主题的 webhook 请求，实时转发给所有通过 WebSocket 订阅了这个主题的客户端，让没有公网地址的程序也能收到 GitHub 等外部服务的推送。

<FactStrip :facts="[
  { label: '技术', value: 'TypeScript · Durable Objects' },
  { label: '线上', value: 'mq.nbtca.space' },
  { label: '始于', value: '2025 年' },
  { label: '维护', value: 'LazuliKao' },
]" />

## 做什么

最典型的用法是群机器人 [HuaJiBot.NET](./huajibot)：GitHub 把仓库动态以 webhook 发到 ServerlessMQ，机器人在内网用 WebSocket 连上同一个主题，随即收到消息并推送进群。机器人和 Minecraft 服务器之间的聊天互通也走这里，两边作为同一主题的订阅者直接互发消息。

- **推送**：`POST /<topic>`，请求体必须是 JSON；
- **订阅**：`GET /<topic>` 或 `GET /ws/<topic>` 升级为 WebSocket 连接，收到的每条消息都带着原始请求体、请求头和方法；
- **客户端互发**：订阅者通过 WebSocket 发出的消息，会转给同一主题下的其他所有订阅者；
- **鉴权**：推送可以用 Token（`Authorization: Bearer`、`X-Auth-Token` 头或 `?token=` 参数），也可以用 HMAC-SHA256 签名，GitHub webhook 自带的 `X-Hub-Signature-256` 可以直接校验；订阅只能用 Token；
- **隔离**：每个主题可以配置独立的 Token 和密钥（`TOKEN_<主题>`、`SECRET_<主题>`），没配的回落到全局值；主题之间互不可见。

它是纯粹的转发，不保存消息：推送时如果没有订阅者在线，这条消息就丢了。在线接口文档在 [mq.nbtca.space/docs](https://mq.nbtca.space/docs)。

## 架构

TypeScript，pnpm workspace 管理的 monorepo：

- **`backend/`**：Worker 本体，路由用 [Hono](https://hono.dev/) 加 [chanfana](https://chanfana.pages.dev/) 生成 OpenAPI 文档。每个主题对应一个 [Durable Object](https://developers.cloudflare.com/durable-objects/) 实例，用 [WebSocket Hibernation API](https://developers.cloudflare.com/durable-objects/best-practices/websockets/) 维持连接，空闲时可以休眠。鉴权在 `src/utils/auth.ts`，转发逻辑在 `src/service/messagequeue.ts`；
- **`frontend/`**：React 应用，构建后由 Worker 在根路径提供。

格式化和代码检查用 [Biome](https://biomejs.dev/)，提交信息由 commitlint 按 [Conventional Commits](https://www.conventionalcommits.org/zh-hans/v1.0.0/) 校验。

## 参与开发

```bash
git clone https://github.com/nbtca/ServerlessMQ.git
cd ServerlessMQ
pnpm install
pnpm dev
```

`pnpm dev:frontend` 启动前端。`pnpm lint` 和 `pnpm format` 只处理已暂存的文件，提交前运行即可。仓库目前没有测试和 CI。

适合上手的任务：

- 删掉没有用上的代码：配置里绑定了 D1 数据库却从未读写，`saveMessage()` 只返回 501，`backend/src/auth.ts` 是空文件；
- Token 比较改用常量时间比较，与签名校验保持一致；
- 服务出错时不再把调用栈返回给请求方；
- 用 [@cloudflare/vitest-pool-workers](https://developers.cloudflare.com/workers/testing/vitest-integration/) 补上第一批测试。

需要先讨论的：给离线的订阅者暂存消息；在线列表广播里包含每个订阅者的 IP 和请求头，是否应该去掉；主题名只存在内存里，Durable Object 休眠唤醒后可能丢失，是否改为持久保存。

〔**最后核对 2026-09**：`frontend/` 仍是脚手架里的计数器示例页，mq.nbtca.space 根路径显示的就是它。做一个真正的状态页，适合熟悉 React 的同学接手。〕

维护者是 [LazuliKao](https://github.com/LazuliKao)。仓库地址：[github.com/nbtca/ServerlessMQ](https://github.com/nbtca/ServerlessMQ)。

## 沿革

ServerlessMQ 的前身是用 Go 写的 [notification-center](https://github.com/nbtca/notification-center)：2023 年 11 月建立，同样是“HTTP 推送、WebSocket 订阅”的模型，自建在协会服务器上。2025 年 4 月起 LazuliKao 把同样的功能搬到 Cloudflare Workers 上，写成 ServerlessMQ；2025 年 10 月加入对 Logto webhook 签名的支持。notification-center 于 2026 年 9 月归档，README 注明职能已迁移到 ServerlessMQ。

## 相关

其他项目见[基础设施与项目](/about/infrastructure)。
