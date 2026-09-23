---
maintainers:
  - user: m1ngsama
    since: 2026-09
---

# HuaJiBot.NET

HuaJiBot.NET 是 NBTCA 的群机器人，用 C# 在 .NET 10 上编写，采用插件式架构：适配器负责连接 QQ、Telegram 等聊天平台，插件负责把维修工单、GitHub 动态、日历提醒等推送进群。它的前身是已归档的 Go 版 [huaji-bot](https://github.com/nbtca/huaji-bot)。

## 做什么

每项功能都是一个独立插件，放在 `src/HuaJiBot.NET.Plugin.*` 目录下：

- **RepairTeam**：订阅 [Saturday](./saturday) 发到消息队列的维修事件，推送到维修队群里，并定期提醒长时间无人接单、接单后迟迟未提交、等待审核的工单；
- **GitHubBridge**：经 [ServerlessMQ](./serverlessmq) 接收 GitHub 的 webhook，把 push、issue、评论等动态发成群消息；
- **Calendar**：读取[协会日历](./calendar-feeds)，按时发送活动提醒和每周的社团事务预告；
- **MessageBridge**：与 Minecraft 服务器互通，在群里用“查询”命令查看在线玩家；
- **AIChat** 与 **DailySummary**：接入大模型，在群里对话，以及每天总结群聊内容。

适配器目前有三个：[OneBot](https://onebot.dev/)、[Satori](https://satori.chat/) 和 Telegram。

〔**最后核对 2026-09**：线上实例自 2026 年 5 月起没有再发出消息，排查记录见 [HuaJiBot.NET#22](https://github.com/nbtca/HuaJiBot.NET/issues/22)。〕

## 参与开发

```bash
git clone https://github.com/nbtca/HuaJiBot.NET.git
cd HuaJiBot.NET
dotnet build
```

需要安装 [.NET 10 SDK](https://dotnet.microsoft.com/download)。用 Visual Studio 或 Rider 打开 `HuaJiBot.NET.slnx` 可以看到完整的解决方案：`HuaJiBot.NET` 是核心，定义插件接口、事件和命令；`HuaJiBot.NET.CLI` 是启动入口；单元测试在 `HuaJiBot.NET.UnitTest`。

想加一个新功能，照现有插件的结构新建一个 `HuaJiBot.NET.Plugin.*` 项目即可，不需要改动核心。推送到 `main` 后，CI 会构建镜像 `ghcr.io/nbtca/huaji-bot-dotnet` 和插件包。[open issues](https://github.com/nbtca/HuaJiBot.NET/issues) 里有待修的渲染问题和部署任务。

主要维护者是 [LazuliKao](https://github.com/LazuliKao)，贡献者还有 [m1ngsama](https://github.com/m1ngsama)。仓库地址：[github.com/nbtca/HuaJiBot.NET](https://github.com/nbtca/HuaJiBot.NET)。

## 相关

其他项目见[基础设施与项目](/about/infrastructure)。
