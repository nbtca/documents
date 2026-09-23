---
maintainers:
  - user: m1ngsama
    since: 2026-09
---

# heartbeat

heartbeat 是 NBTCA 各项线上服务的状态页与可用性监控，部署在 [status.nbtca.space](https://status.nbtca.space)，中文版在 [/zh](https://status.nbtca.space/zh)。它每分钟检查一次协会主页、文档站、维修 API、[NBTCA 账号](./nbtca-account)、短链接等服务；哪项服务打不开时，先来这里看是不是全站的问题。

<FactStrip :facts="[
  { label: '技术', value: 'Cloudflare Worker · D1' },
  { label: '线上', value: 'status.nbtca.space' },
  { label: '始于', value: '2026 年' },
  { label: '维护', value: 'm1ngsama' },
]" />

<Figure src="./assets/project-heartbeat.webp" alt="状态页中文版：顶部绿色横幅写着“一切正常，全部 13 项服务运行正常”，下方逐项列出 nbtca.space、docs.nbtca.space、blogs.nbtca.space、维修预约与维修 API，每项右侧是可用率和一排代表每天状态的竖条" caption="每项服务一行，竖条是过去 90 天每天的状态，右侧是可用率。" date="2026-09" wide />

## 做什么

- **检查**：每分钟从 Cloudflare 的边缘节点检查一次；设计上还有一个部署在国内集群里的探针，从国内再测一遍；
- **判定**：只看最近三次结果，所有地区都失败才算故障，部分地区失败算部分故障，响应超过 3 秒算缓慢；某个探针失联时直接跳过，不会误报成故障；
- **展示**：每项服务保留 90 天的每日可用率，另有最近 60 分钟的曲线、各地区延迟和 TLS 证书到期时间；
- **分组**：网站、维修、账号、应用、游戏五组面向所有人；消息与存储、平台、镜像三组是内部设施，折叠显示，不计入页面顶部的总体状态，但照样检查、照样告警；
- **公告**：故障和维护公告以 Markdown 文件写在仓库的 `incidents/` 目录，合并进 `main` 即发布；
- **接口**：`GET /api/status` 返回页面上显示的同一份状态，服务状态变化时向配置好的通知地址推送告警。

## 架构

一个 [Cloudflare Worker](https://developers.cloudflare.com/workers/) 加一个 [D1](https://developers.cloudflare.com/d1/) 数据库，用 TypeScript 编写，没有运行时依赖。定时任务每分钟触发一次，原始检查结果保留 30 天，按天汇总的统计保留更久。国内探针是 `probe/` 下的一个小容器，每分钟向 Worker 领取检查清单、跑同一份检查代码，再把结果回传。

要检查哪些服务写在根目录的 `monitors.ts`，页面文案在 `src/text.ts`，中英两种语言的键必须一致，否则构建失败。

## 参与开发

```bash
git clone https://github.com/nbtca/heartbeat.git
cd heartbeat
npm ci && npm test && npm run check
echo 'PROBE_TOKEN=dev' > .dev.vars
npx wrangler d1 migrations apply heartbeat --local
npm run dev
```

本地服务起来后，访问 `http://localhost:8787/__scheduled?cron=*+*+*+*+*` 手动触发一轮检查。PR 上会跑类型检查和测试，合并进 `main` 后自动部署。

最常见的两类贡献都不用写业务代码：

- **新增一项监控**：在 `monitors.ts` 里加一条。必填 `id`、`name`（服务名，英文）、`role`（背后是哪个项目、在哪个地址）和 `http` 或 `tcp`；`zh` 是 `role` 的中文版本；接口正常时不返回 2xx 的，用 `status` 写明期望的状态码；
- **发布一条故障公告**：在 `incidents/` 下新建一个 Markdown 文件，写明标题、影响程度和受影响的服务，正文按时间记录“发现”“恢复”等进展，格式见仓库 README。

其他适合上手的任务：日历订阅源的监控名写成了 “Timetable feed”，实际上它提供的是活动和校历，不是个人课表。

需要先讨论的：让国内探针真正上线，并确认告警最终送到了哪里。

〔**最后核对 2026-09**：国内探针尚未上报数据，页面上的检查目前只来自 Cloudflare 边缘；仓库里还没有发布过故障公告。〕

维护者是 [m1ngsama](https://github.com/m1ngsama)。仓库地址：[github.com/nbtca/heartbeat](https://github.com/nbtca/heartbeat)。

## 沿革

2024 年 11 月，fananly233 基于开源项目 UptimeFlare 搭过一版状态页 [uptimeflare](https://github.com/nbtca/uptimeflare)，监控主页、webhook、Minecraft 服务器等四个目标；2025 年 9 月建立的 [github_upptime](https://github.com/nbtca/github_upptime) 则始终停留在模板的默认配置。

[2025 年 12 月的技术分享会](/archived/2025/2025-12-26-nwdc)以可观测性为主题，会后的行动计划之一是“配置公开可访问的监控仪表盘，替代现有 Uptime 监控工具”。heartbeat 于 2026 年 9 月 11 日上线，9 月 20 日加入中文版和分地区检查。

## 相关

其他项目见[基础设施与项目](/about/infrastructure)。
