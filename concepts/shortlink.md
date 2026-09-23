---
maintainers:
  - user: m1ngsama
    since: 2026-09
---

# shortlink

shortlink 是 NBTCA 的短链接服务，跑在 Cloudflare Workers 上，部署在 link.nbtca.space。访问 `link.nbtca.space/<路径>` 会被 301 跳转到登记好的长网址，适合印在海报上或发在群里；群机器人推送 GitHub 动态时附的短链接也出自这里。

<FactStrip :facts="[
  { label: '技术', value: 'TypeScript · Workers KV' },
  { label: '线上', value: 'link.nbtca.space' },
  { label: '始于', value: '2024 年' },
  { label: '维护', value: 'LazuliKao' },
]" />

## 做什么

- **跳转**：任何人都能访问短链接，不需要登录；
- **管理界面**：`/admin` 可以新建短链接（自定义路径或随机生成 6 位）、查看全部链接、复制和预览，暂时不能删除或修改；
- **接口**：`POST /api/shorten` 新建，`GET /api/link/<路径>` 查询一条，`GET /api/links` 列出全部；
- **访问控制**：`/admin` 和 `/api/` 由 [Cloudflare Access](https://developers.cloudflare.com/cloudflare-one/applications/) 在边缘挡住，浏览器访问会先跳到登录页；程序调用要带 Access 的[服务令牌](https://developers.cloudflare.com/cloudflare-one/identity/service-tokens/)，群机器人就是这样调用的。

## 架构

TypeScript 编写的单个 Worker，入口是 `src/index.ts`。短链接存在 [Workers KV](https://developers.cloudflare.com/kv/) 里，键是路径、值是长网址；接口路由用 [itty-router](https://itty.dev/itty-router)，写在 `src/router.ts`；管理界面是 `src/admin-ui.ts` 里的一段内联 HTML；`src/access.ts` 校验 Access 签发的 JWT。Access 的配置步骤写在仓库的 `CLOUDFLARE_ACCESS_SETUP.md`。

## 参与开发

```bash
git clone https://github.com/nbtca/shortlink.git
cd shortlink
npm install
npm run dev
```

`wrangler dev` 默认使用本地模拟的 KV，不会碰到线上数据。仓库的默认分支叫 `💥`，推送到这个分支就会自动部署到线上，合并 PR 前要格外小心。`workers.dev` 默认域名在配置里被关掉了，因为从那里访问会绕过 Access 的保护，改配置时不要重新打开。

适合上手的任务：

- 访问不存在的路径时返回 404，现在返回的是 200；
- 删掉 `ab-test.ts`、`proxy.ts`、`redirect.ts` 这几个整篇注释掉的模板文件；
- 新建时校验网址格式，自定义路径已存在时拒绝覆盖，现在会直接覆盖；
- 管理界面改用 `textContent` 渲染链接，不再拼接 `innerHTML`；
- 补上 README 和测试，这两样目前都没有。

需要先讨论的：删除和修改链接的接口与界面，链接超过 1000 条后的分页。

〔以上任务为**最后核对 2026-09** 时的状态。〕

仓库由 [LazuliKao](https://github.com/LazuliKao) 建立，之后的改动来自 [wen-templari](https://github.com/wen-templari) 和 [m1ngsama](https://github.com/m1ngsama)。仓库地址：[github.com/nbtca/shortlink](https://github.com/nbtca/shortlink)。

## 沿革

- **2024 年 3 月**：从 Cloudflare 的 Worker 模板起步，只有一个用固定 Token 保护的新建接口；
- **2025 年 12 月**：接入 Cloudflare Access，加入管理界面和查询接口；
- **2026 年 9 月**：改为真正校验 Access 的 JWT 签名，并关闭 `workers.dev` 域名。此前只要请求头里带着 Access 的字段就算通过，存在绕过的可能。

## 相关

其他项目见[基础设施与项目](/about/infrastructure)。
