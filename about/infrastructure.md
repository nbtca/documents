# 基础设施与项目

:::info 维护信息

| 维护人                                   | 时间          |
| ---------------------------------------- | ------------- |
| [@m1ngsama](https://github.com/m1ngsama) | 2026.07 - Now |

:::

NBTCA 的线上那一面，是一个持续运转的开源社区：几台自建服务器、一批跑在 Cloudflare 上的无服务函数，和几十个公开在 [github.com/nbtca](https://github.com/nbtca) 上的项目，共同支撑着维修、活动、宣传和日常协作。这一页做一个概览——想深入某个项目，点进它的仓库即可。

## 维修系统（weekend 项目）

NBTCA 最核心的自建系统，支撑[维修日](/repair/repair-day)和日常报修：

- [Saturday](https://github.com/nbtca/Saturday)（Go）——报修服务的后端 API（repair.nbtca.space）。
- [Sunday](https://github.com/nbtca/Sunday)（Vue）——维修事件管理网站。
- **Hawaii**（微信小程序「NBT电脑维修」，内部仓库）——用于发起报修。

系统怎么运转（工单状态流转、`@nbtca-bot` 命令、志愿者时长统计），见[工单系统](/repair/weekend)。

## 自建基础设施

- **校园网认证**：[nbtverify](https://github.com/nbtca/nbtverify)（Go）与 [luci-app-nbtverify](https://github.com/nbtca/luci-app-nbtverify)——对接学校的卓智网络接入门户，也适配 OpenWrt 路由器。
- **文件与镜像站**：内网镜像站 i.nbtca.space（维修工具、系统镜像等，见[软件仓库索引](/repair/tools)）。
- **无服务后端**：不少服务跑在 Cloudflare Workers 上，例如 [ServerlessMQ](https://github.com/nbtca/ServerlessMQ)（消息队列 / webhook 转 websocket）、[shortlink](https://github.com/nbtca/shortlink)（短链接）、[uptimeflare](https://github.com/nbtca/uptimeflare)（可用性监控）。
- **虚拟组网**：基于 Headscale 自建的 Tailscale 网络，见 [Tailscale 使用指南](/tutorial/2025/tailscale-usage)。
- **编排与基础设施即代码**：用 Terraform 和 Docker 管理部署。
- **消息中转**：[notification-center](https://github.com/nbtca/notification-center)（Go）把各类 webhook 汇聚成统一消息中心。

## 机器人与自动化

- [HuaJiBot.NET](https://github.com/nbtca/HuaJiBot.NET)（C#）——当前的群机器人；前身是已归档的 [huaji-bot](https://github.com/nbtca/huaji-bot)（Go）。

## 网站与内容

- [Home](https://github.com/nbtca/Home)（Astro）——协会主页 nbtca.space。
- [blogs](https://github.com/nbtca/blogs)（Vue）——计协博客；投稿见[撰写并发布你的第一篇 NBTCA 博客](/process/2025/nbtca-post)。
- [documents](https://github.com/nbtca/documents)（本站）、[docs](https://github.com/nbtca/docs) 数据库与 [nbtcal](https://github.com/nbtca/nbtcal) 日历。

## 开发上手

新加入开发的成员，可以从 [dev101](https://github.com/nbtca/dev101) 起步（"First day at NBTCA dev team"）。协作方式见 [GitHub 工作流](/tutorial/2025/github-workflow) 与 [Roadmap](/concepts/roadmap)。

## 更多

以上只是概览。NBTCA 还维护 Minecraft 服务器、聊天室项目（pit 系列）、照片整理、DNS 同步等——完整清单见 [github.com/nbtca](https://github.com/nbtca)。
