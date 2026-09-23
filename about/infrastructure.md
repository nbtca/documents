---
order: 4
maintainers:
  - user: m1ngsama
    since: 2026-07
---

# 基础设施与项目

NBTCA 的线上那一面，是一个持续运转的开源社区：几台自建服务器、一批跑在 Cloudflare 上的无服务函数，和几十个公开在 [github.com/nbtca](https://github.com/nbtca) 上的项目，共同支撑着维修、活动、宣传和日常协作。仍在活跃开发的项目各有一篇词条，写明它做什么、怎么在本地跑起来、有哪些适合上手的任务。

〔仓库会新增、合并或停更，这页只是某一刻的快照。**最后核对：2026-09**；以 [github.com/nbtca](https://github.com/nbtca) 上的实际情况为准。标注“私有”的仓库只对组织成员开放，非成员点进去会看到 404，不是链接失效。〕

<LinkCards>
  <LinkCard href="/concepts/home" title="Home" desc="协会主页 nbtca.space：报修、维修面板、成员博客与活动日历。Astro。" src="../concepts/assets/project-home-thumb.webp" alt="协会主页首页的博客卡片" />
  <LinkCard href="/concepts/saturday" title="Saturday" desc="维修服务的后端 API，七百多张工单都经过它。Go 与 PostgreSQL。" src="../concepts/assets/project-saturday-thumb.webp" alt="Saturday 在线接口文档里“Commit event”接口的标题和请求地址" />
  <LinkCard href="/concepts/huajibot" title="HuaJiBot.NET" desc="群机器人：工单推送、GitHub 动态、活动提醒、Minecraft 互通。C#。" src="../concepts/assets/project-huajibot-thumb.webp" alt="群机器人在 QQ 群里发出的活动提醒" />
  <LinkCard href="/concepts/heartbeat" title="heartbeat" desc="各项线上服务的状态页，每分钟检查一次。Cloudflare Worker。" src="../concepts/assets/project-heartbeat-thumb.webp" alt="状态页上逐项列出的服务与可用率" />
  <LinkCard href="/concepts/cabadge" title="CABadge" desc="计协电子吧唧，圆形触摸屏徽章，硬件与固件全部开源。ESP32-S3。" src="../concepts/assets/project-cabadge-thumb.webp" alt="电子吧唧上显示的协会名片" />
  <LinkCard href="/concepts/nbtca-account" title="NBTCA 账号" desc="各项服务共用的一套登录，基于自建的 Logto。" src="../concepts/assets/project-account-thumb.webp" alt="NBTCA 账号的登录页" />
</LinkCards>

## 维修

协会最核心的自建系统，支撑[维修日](/repair/repair-day)和日常报修，怎么运转见[维修工单系统](/repair/weekend)。

- [Saturday](/concepts/saturday)（Go）：维修服务的后端 API；
- [Home](/concepts/home) 的 [/repair](https://nbtca.space/repair)：报修入口和队员的维修面板；
- [Sunday](https://github.com/nbtca/Sunday)（Vue）：旧管理页 repair.nbtca.space，仍在线，页面顶部提示前往新地址，已不再开发；
- [Hawaii](https://github.com/nbtca/Hawaii)（TypeScript，私有）：微信小程序“NBT电脑维修”，[已停用](/concepts/repair-miniprogram)；
- [RepairRecordPDF](https://github.com/nbtca/RepairRecordPDF)（C#）：把已完成的工单渲染成 A5 维修记录单。

## 网站与工具

- [Home](/concepts/home)（Astro）：协会主页 nbtca.space，成员博客的投稿见[撰写并发布你的第一篇 NBTCA 博客](/process/2025/nbtca-post)；
- [协会日历](/concepts/calendar-feeds)：活动和校历的 ICS 订阅源，配套的 nbtcal 库负责解析；
- [Prompt](/concepts/prompt)（TypeScript）：终端客户端，查活动、读文档、看服务状态、导出课表；
- [documents](https://github.com/nbtca/documents)：你正在读的这个文档站，贡献方式见仓库的 CONTRIBUTING；配套的 [docs](https://github.com/nbtca/docs) 库供其他项目读取本站内容；
- [nbtverify](/concepts/nbtverify)（Go）：[校园网认证](/concepts/campus-network-auth)的命令行工具和 OpenWrt 插件；
- 纳新登记：主页“加入我们”表单的后端是 [serverless-active](https://github.com/nbtca/serverless-active)，一个 Cloudflare Worker；
- 历史站点：旧版计协博客 blogs.nbtca.space 仍在线，内容停在 2024 年，仓库 [blogs](https://github.com/nbtca/blogs) 已归档（私有）；[published_post](https://nbtca.github.io/published_post/) 镜像了 2015 至 2023 年的 77 篇公众号文章。

## 消息与自动化

- [HuaJiBot.NET](/concepts/huajibot)（C#）：群机器人，前身是已归档的 [huaji-bot](https://github.com/nbtca/huaji-bot)（Go）；
- [ServerlessMQ](/concepts/serverlessmq)：把 webhook 转成 WebSocket 推送的消息中转，取代了已归档的 [notification-center](https://github.com/nbtca/notification-center)；
- [shortlink](/concepts/shortlink)：短链接服务 link.nbtca.space；
- [heartbeat](/concepts/heartbeat)：服务状态页 status.nbtca.space。

## 账号、网络与部署

- **账号**：[NBTCA 账号](/concepts/nbtca-account)基于协会维护的 [Logto 分支](https://github.com/nbtca/logto)，个人中心是 [Logto-USS](https://github.com/nbtca/Logto-USS)，内部管理页由 [traefik-forward-auth](https://github.com/nbtca/traefik-forward-auth) 把关；
- **部署**：主页、Saturday、Sunday 跑在 Kubernetes 上，群机器人和 Minecraft 服务器用 Docker Compose，清单都在私有仓库 [stacks](https://github.com/nbtca/stacks)；更早的 Terraform 与 Docker Swarm 方案（[infra](https://github.com/nbtca/infra)，私有）已停用。无状态的服务，比如文档站、短链接、日历、状态页，跑在 Cloudflare Workers 和 Pages 上；
- **镜像**：[cloudflare-docker-proxy](https://github.com/nbtca/cloudflare-docker-proxy) 在 Cloudflare 上代理 Docker Hub 和 GHCR，Saturday 等服务部署时经它拉取镜像；
- **虚拟组网**：基于 Headscale 自建的 Tailscale 网络，中继节点用的是改造过的 [tailscale-derp](https://github.com/nbtca/tailscale-derp)，见 [Tailscale 使用指南](/tutorial/manual/tailscale-usage)。

## 存储与镜像站

- **内网镜像站** i.nbtca.space：维修工具和系统镜像，清单见[软件仓库索引](/repair/tools)，早期由 [Repair-Tools](https://github.com/nbtca/Repair-Tools) 仓库管理。这条线可以追到很早：2016 年的[装系统教学课件](/archived/2016/os-install-course)里，系统镜像的下载链接已经指向协会自建的内网 FTP（`ftp://10.80.6.166`）；
- **协会云盘** icloud.nbtca.space：协会 OneDrive 的只读索引，基于 [onedrive-cf-index-ng](https://github.com/nbtca/onedrive-cf-index-ng)，本站存档的原件都来自这里；
- **文件门户**：[OpenList](https://github.com/nbtca/OpenList) 与 [OpenList-Frontend](https://github.com/nbtca/OpenList-Frontend) 两个分支加入了按 NBTCA 账号角色控制访问权限的功能，是协会在上游项目上改动最多的一处。

## 硬件与游戏

- [CABadge](/concepts/cabadge)（C）：计协电子吧唧，硬件、固件和配套工具全部开源；
- [Minecraft](https://github.com/nbtca/Minecraft)：协会 Minecraft 服务器的进服教程；与 QQ 群互通消息的插件在 [mcje-plugins](https://github.com/nbtca/mcje-plugins)。

## 参与开发

每篇项目词条的“参与开发”一节都列了本地运行步骤和适合上手的任务，挑一个感兴趣的开始即可。提交代码的流程见 [GitHub 工作流](/tutorial/manual/github-workflow)，跨项目的事务在 [Roadmap](/concepts/roadmap) 上跟踪。

以上之外，组织里还有一批已经停更的实验项目，比如 2023 年的聊天室 pit 系列、内网主页 Welcome 与 win-panel，以及照片整理、DNS 同步等小工具；完整清单见 [github.com/nbtca](https://github.com/nbtca)。
