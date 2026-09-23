---
maintainers:
  - user: m1ngsama
    since: 2026-09
---

# HuaJiBot.NET

HuaJiBot.NET 是 NBTCA 的群机器人，群里显示为“NBTCA Bot”，用 C# 在 .NET 10 上编写。它采用插件式架构：适配器负责连接 QQ、Telegram 等聊天平台，插件负责把维修工单、GitHub 动态、活动提醒推送进群，也能在群里查询日程、和 Minecraft 服务器互通消息。前身是已归档的 Go 版 [huaji-bot](https://github.com/nbtca/huaji-bot)。

<FactStrip :facts="[
  { label: '技术', value: 'C# · .NET 10' },
  { label: '平台', value: 'QQ · Telegram' },
  { label: '始于', value: '2023 年' },
  { label: '维护', value: 'LazuliKao' },
]" />

<Figure src="./assets/project-huajibot-calendar.webp" alt="QQ 群聊截图：NBTCA Bot 在晚上七点半发出日程提醒，介绍一场关于 BaaS 的 NWDC 技术分享和参会链接，写着“将于 60 分钟后开始”；十点二十五分又提醒“预计于 5 分钟后结束”" caption="Calendar 插件读取协会日历，在活动开始前一小时和结束前五分钟各提醒一次。" date="2026-03" source="HuaJiBot.NET#15" wide />

## 做什么

每项功能都是一个独立插件，放在 `src/HuaJiBot.NET.Plugin.*` 目录下，群里用的命令写在括号里：

- **RepairTeam**（`工单`）：订阅 [Saturday](./saturday) 发到 NSQ 消息队列的维修事件，推送到维修队群里；每天定时汇总长时间无人接单、接单后迟迟未提交、等待审核的工单；
- **GitHubBridge**：经 [ServerlessMQ](./serverlessmq) 接收 GitHub 的 webhook，只转发默认分支的 push、issue 的开启与关闭、新评论三类动态。QQ 里发成一张渲染好的图片卡片，附一条[短链接](./shortlink)；Telegram 里发成原生富文本；
- **Calendar**（`日程`、`最近日程`）：每 15 分钟同步一次[协会日历](./calendar-feeds)，在活动开始前 60 分钟和结束前 5 分钟提醒，另有每周的社团事务预告；
- **MessageBridge**（`查询`、`事件`）：与 Minecraft 服务器双向转发聊天，玩家进出、死亡、成就也会播报到群里，两边同样通过 ServerlessMQ 连接；
- **AIChat**：在允许的群里被 @ 时用大模型回答，可以调用 Calendar 等插件提供的函数和 [MCP](https://modelcontextprotocol.io/) 工具；
- **DailySummary**（`总结`）：只在明确启用的群里记录聊天，每天总结一次前一天的内容。

所有群都能用 `帮助` 列出当前可用的命令。适配器有三个：[OneBot](https://onebot.dev/) 11、[Satori](https://satori.chat/) 和 Telegram，在 `config.json` 的 `Service` 里选一个。

## 架构

- **`HuaJiBot.NET`**：核心，包括插件加载、事件、命令系统、配置和聊天记录库；
- **`HuaJiBot.NET.CLI`**：启动入口，适配器直接编译在里面；
- **`HuaJiBot.NET.AI`**：各插件共用的大模型连接；
- **`HuaJiBot.NET.SourceGenerator`**：编译期收集带 `[Command]` 的方法，替代运行时反射；
- **`HuaJiBot.NET.UnitTest`**：NUnit 单元测试。

插件编译成独立的 DLL，运行时从 `plugins/` 目录加载，每个插件用一条程序集级的 `PluginEntryPoint` 特性声明入口类、名称和描述。每个插件的配置是 `config.json` 里 `Plugins` 下的一节；首次运行会把所有插件的默认配置写进去。机器人运行中也会回写这个文件，改配置前要先停掉进程，否则改动会被覆盖。

## 参与开发

需要 [.NET 10 SDK](https://dotnet.microsoft.com/download)：

```bash
git clone https://github.com/nbtca/HuaJiBot.NET.git
cd HuaJiBot.NET
dotnet build
dotnet test src/HuaJiBot.NET.UnitTest
```

单元测试不需要连接任何服务；另有十余个标了 `[Explicit]` 的集成测试，需要真实的消息队列或大模型才能跑。想在自己的群里试，最省事的是建一个私有 Telegram 群：`config.json` 里把 `Service` 设为 `Telegram`，填上 [BotFather](https://core.telegram.org/bots/features#botfather) 给的 token，用不上的插件把 `Enabled` 设为 `false`。

写一个新插件不需要改动核心，照 RepairTeam 的结构新建一个 `HuaJiBot.NET.Plugin.*` 项目：

```csharp
public partial class PluginMain : PluginBase
{
    [Command("你好", "打个招呼")]
    private Task HelloAsync(GroupMessageEventArgs e) => e.Reply("你好！");

    protected override void Unload() { }
}
```

用了 `[Command]` 的插件类必须声明为 `partial`，否则源生成器生成的代码会让编译报 CS0260。`build_plugins.fsx` 会自动打包所有以 `HuaJiBot.NET.Plugin` 开头的项目。

推送到 `main` 后，CI 构建镜像 `ghcr.io/nbtca/huaji-bot-dotnet` 和插件包，但不会自动部署，上线由维护者在服务器上手动完成。

适合上手的任务：

- 删掉 `PluginConfigAccessor.cs`、`CommandEnumCache.cs` 这类从未被调用的代码；
- 让 CI 跑完整的单元测试，现在 PR 上只跑其中一组；
- 把 README 里的“How to deploy? you guess it”换成真正的部署说明，并列出各插件的配置项；
- 两个插件注册了同名命令时给出清楚的报错，而不是直接跳过后加载的插件。

需要先讨论的：GitHubBridge 是否转发 PR 和 Release，Calendar 支持多个订阅源，维修事件是继续走 NSQ 还是改走 GitHub。

〔**最后核对 2026-09**：QQ 群里的机器人自 2026 年 9 月下旬重新在线，但线上跑的镜像比 main 分支旧，每日总结还没配置模型，见 [HuaJiBot.NET#38](https://github.com/nbtca/HuaJiBot.NET/issues/38)；Telegram 一侧在 2026 年 9 月 10 日报告时已沉默约四个月，此后是否恢复未见记录，见 [HuaJiBot.NET#22](https://github.com/nbtca/HuaJiBot.NET/issues/22)。〕

主要维护者是 [LazuliKao](https://github.com/LazuliKao)，贡献者还有 [m1ngsama](https://github.com/m1ngsama) 和 [Yuna-Celisse](https://github.com/Yuna-Celisse)。仓库地址：[github.com/nbtca/HuaJiBot.NET](https://github.com/nbtca/HuaJiBot.NET)。

## 沿革

- **2022–2023 年**：Go 版 huaji-bot 基于 MiraiGo 模板改写，唯一的功能是接收 Saturday 的调用、把维修事件发到群里；2024 年 4 月归档，Saturday 直到 2025 年 4 月才去掉这条调用；
- **2023 年 10 月**：C# 版以 `huaji-bot-dotnet` 为名开始编写，11 月内相继加入日历、GitHub 推送、OneBot 适配和 Minecraft 互通；
- **2024 年**：3 月加入 Satori 适配；
- **2025 年**：加入 AIChat 和 Telegram 适配，升级到 .NET 10；
- **2026 年**：5 月重构插件管理与命令系统，9 月加入每日总结，并集中修复刷屏、卡片渲染等问题。

2023 年 10 月的[开发组规划](/archived/2023/developer/2023-10-dev-roadmap)给 QQ 机器人列了两条路：一条是用 C# 重构，另起项目 `huaji-bot-dotnet`，也就是本仓库改名前的名字；另一条是继续维护 Go 写的旧版 huaji-bot，但它依赖的 GoCQ 上游协议已经受到限制，原文估计“可能要动大刀”。“同步日历”当时就列为待实现功能。同年 11 月的[例会](/archived/2023/meetings/2023-11-04-meeting)讨论成员生日提醒时，QQ 机器人也是候选方案之一。[2025 年 1 月的部长会议](/archived/2025/2025-01-25-officers-meeting)回顾开发部一年多的工作，把 QQ 机器人的迭代列在基础设施建设之下。

## 相关

其他项目见[基础设施与项目](/about/infrastructure)。
