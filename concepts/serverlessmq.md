---
maintainers:
  - user: m1ngsama
    since: 2026-09
---

# ServerlessMQ

ServerlessMQ 是 NBTCA 自建的轻量消息中转服务，跑在 Cloudflare Workers 上，部署在 mq.nbtca.space。它把发往某个主题的 webhook 请求，实时转发给所有通过 WebSocket 订阅了这个主题的客户端，让没有公网地址的程序也能收到 GitHub 等外部服务的推送。

## 做什么

最典型的用法是群机器人 [HuaJiBot.NET](./huajibot)：GitHub 把仓库动态以 webhook 发到 ServerlessMQ，机器人在内网用 WebSocket 连上同一个主题，随即收到消息并推送进群。

- **推送**：`POST /<topic>`，请求体是任意 JSON；
- **订阅**：`GET /<topic>` 升级为 WebSocket 连接，收到的每条消息都带着原始请求体、请求头和方法；
- **鉴权**：推送可以用 Bearer Token，也可以用 HMAC-SHA256 签名，GitHub webhook 自带的 `X-Hub-Signature-256` 可以直接校验；订阅只能用 Token；
- **隔离**：每个主题可以配置独立的 Token 和密钥，主题之间互不可见；有客户端连上或断开时，会向同一主题的其他客户端广播当前在线列表。

## 技术栈

TypeScript，pnpm workspace 管理的 monorepo：`backend/` 是 Worker，每个主题由一个 [Durable Object](https://developers.cloudflare.com/durable-objects/) 维持 WebSocket 连接；`frontend/` 是 React 应用。格式化和代码检查用 [Biome](https://biomejs.dev/)，提交信息由 commitlint 按 [Conventional Commits](https://www.conventionalcommits.org/zh-hans/v1.0.0/) 校验。

## 参与开发

```bash
git clone https://github.com/nbtca/ServerlessMQ.git
cd ServerlessMQ
pnpm install
pnpm dev
```

`pnpm dev:frontend` 启动前端。`pnpm lint` 和 `pnpm format` 只处理已暂存的文件，提交前运行即可。

〔**最后核对 2026-09**：`frontend/` 仍是脚手架示例页，还没有实际功能。查看主题、在线客户端和最近消息的管理界面尚待开发，适合熟悉 React 的同学接手。〕

维护者是 [LazuliKao](https://github.com/LazuliKao)。仓库地址：[github.com/nbtca/ServerlessMQ](https://github.com/nbtca/ServerlessMQ)。

## 相关

其他项目见[基础设施与项目](/about/infrastructure)。
