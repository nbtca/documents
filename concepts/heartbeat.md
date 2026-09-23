---
maintainers:
  - user: m1ngsama
    since: 2026-09
---

# heartbeat

heartbeat 是 NBTCA 各项线上服务的状态页与可用性监控，部署在 [status.nbtca.space](https://status.nbtca.space)（中文版在 [/zh](https://status.nbtca.space/zh)）。它每分钟检查一次协会主页、文档站、维修 API、单点登录、短链接等服务，某项服务出问题时先来这里看。

## 做什么

- 每分钟从两处探测：Cloudflare 的边缘节点，以及部署在协会国内集群里的探针；
- 连续两次失败才判定故障，探针本身失联时不计入故障；
- 保留每项服务 90 天的可用率，并显示最近 60 分钟的曲线、各地区延迟和 TLS 证书到期时间；
- 故障和维护公告以 Markdown 文件写在仓库的 `incidents/` 目录，合并进 `main` 即发布；
- 服务状态变化时向配置好的通知地址推送告警；
- 对外提供 `GET /api/status`，返回页面上显示的同一份状态。

## 技术栈

一个 [Cloudflare Worker](https://developers.cloudflare.com/workers/) 加一个 [D1](https://developers.cloudflare.com/d1/) 数据库，用 TypeScript 编写，没有运行时依赖。国内探针另以容器形式跑在集群里。推送到 `main` 后由 GitHub Actions 自动部署。

## 参与开发

```bash
git clone https://github.com/nbtca/heartbeat.git
cd heartbeat
npm ci && npm test && npm run check
echo 'PROBE_TOKEN=dev' > .dev.vars
npx wrangler d1 migrations apply heartbeat --local
npm run dev
```

本地服务起来后，访问 `http://localhost:8787/__scheduled?cron=*+*+*+*+*` 手动触发一轮检查。

最常见的两类贡献都不用写业务代码：

- **新增一项监控**：在 `monitors.ts` 里加一条，写上服务名、中文名和检查地址；
- **发布一条故障公告**：在 `incidents/` 下新建一个 Markdown 文件，格式见仓库 README。

页面文案在 `src/text.ts`，中英两种语言的键必须一致，否则构建失败。

维护者是 [m1ngsama](https://github.com/m1ngsama)。仓库地址：[github.com/nbtca/heartbeat](https://github.com/nbtca/heartbeat)。

## 相关

其他项目见[基础设施与项目](/about/infrastructure)。
