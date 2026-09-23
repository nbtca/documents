---
maintainers:
  - user: m1ngsama
    since: 2026-09
---

# shortlink

shortlink 是 NBTCA 的短链接服务，跑在 Cloudflare Workers 上，部署在 link.nbtca.space。访问 `link.nbtca.space/<路径>` 会被 301 跳转到登记好的长网址，适合印在海报上或发在群里。

## 做什么

- **跳转**：任何人都能访问短链接，不需要登录；
- **管理**：`/admin` 是网页管理界面，`/api/` 下有创建短链接、查询单条和列出全部的接口；这两部分由 [Cloudflare Access](https://developers.cloudflare.com/cloudflare-one/applications/) 保护，需要先登录，脚本和 CI 可以改用 Bearer Token 调用；
- **自动缩短**：群机器人 [HuaJiBot.NET](./huajibot) 推送 GitHub 动态时，会调用这里的接口把长链接缩短。

## 技术栈

TypeScript 编写的单个 Worker，短链接存在 [Workers KV](https://developers.cloudflare.com/kv/) 里，路由用 [itty-router](https://itty.dev/itty-router)。Access 的配置步骤写在仓库的 `CLOUDFLARE_ACCESS_SETUP.md`。

## 参与开发

```bash
git clone https://github.com/nbtca/shortlink.git
cd shortlink
npm install
npm run dev
```

`wrangler dev` 默认使用本地模拟的 KV，不会碰到线上数据。`workers.dev` 默认域名在配置里被关掉了，因为从那里访问会绕过 Access 的保护，改配置时不要重新打开。

〔**最后核对 2026-09**：仓库还没有 README 和测试。〕

维护者是 [LazuliKao](https://github.com/LazuliKao)。仓库地址：[github.com/nbtca/shortlink](https://github.com/nbtca/shortlink)。

## 相关

其他项目见[基础设施与项目](/about/infrastructure)。
