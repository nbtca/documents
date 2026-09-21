---
order: 17
maintainers:
  - user: Yuna-Celisse
    since: 2026-09
---

# 模型与工具推荐

本文按计费方式把可选方案分成免费、按量付费与订阅三类，列出每类里可用的工具组合、额度规则与注意事项。

## 概览

| 情况         | 走哪档     | 代表组合                                                                                  |
| ------------ | ---------- | ----------------------------------------------------------------------------------------- |
| 零预算       | 免费档     | OpenCode Zen 免费模型，WorkBuddy 体验版                                                   |
| 按量付费     | 便宜按量档 | DeepSeek V4.1 Flash 配 Claude Code / Codex / OpenCode / Kimi Code / Qoder CN，OpenCode Go |
| 长期高频使用 | 订阅包量档 | 阿里云百炼 Token Plan，Qoder CN 订阅，ChatGPT Plus / Pro 含 Codex，Copilot Pro / Pro+     |

价格与免费额度变得很快。下文数字都是 2026 年 9 月核实过的快照，下单前以各官方定价页为准。本文涉及的国内工具与国内订阅（Qoder CN、阿里云百炼、WorkBuddy）一律按国内站的人民币费率列出；境外服务（OpenCode Go、ChatGPT、Copilot）仍按官网美元价。

## 免费且相对高质量

### OpenCode Zen 免费模型

OpenCode Zen 是 OpenCode 官方的网关，只收经过实测的编码模型。文档在 [Zen](https://opencode.ai/docs/zen)。

免费的几个模型 ID 格式是 `opencode/<model-id>`，当前包括 `muse-spark-1.3-contributor-free`、`big-pickle`、`mimo-v2.5-free`、`ling-3.0-flash-fin-free`、`nemotron-3-ultra-free`、`nemotron-3.5-lightning-free`。其中 Muse Spark 系列是 Meta 的编码模型，1M 上下文，适合多文件改写与修 bug，免费档里优先试它。

注意三件事：

- 免费模型是限时提供，名单会变。用 `/models` 看实时列表。
- 免费模型在 TUI 与桌面端的模型列表里直接可选，不需要登录 Zen。
- 免费期提交的数据可能被用于改进模型。Zen 隐私条款里对 Big Pickle、MiMo 等免费模型写明了这一点，机密代码不要走免费模型。

### WorkBuddy 体验与认证福利

WorkBuddy 是腾讯的 AI 编程助手。本文只涉及国内版，国内版按积分计费，文档见 [国内个人版计费概述](https://cloud.tencent.com/document/product/1749/126592)。

零成本能拿到的部分：

- 国内体验版：每月 500 积分，代码补全限时无限次，Auto 模型调度限时全模型可选。
- 学生认证：开学季活动，在读大学生经学信网实人核验通过后送 1000 积分，领取截止 2026 年 10 月 31 日。入口在客户端右侧弹窗，或手机端扫码领取。
- 教师认证：[WorkBuddy 教师福利](https://www.workbuddy.cn/events/teacher-benefit)核验通过送 1000 积分，自领取起 3 个月内有效。
- 成长任务与限时加赠：客户端里的成长计划、用量管理页会不定期出现加赠入口，看到就领。

学生与教师的 1000 积分都是限时活动，不是长期条款，具体规则以客户端内的活动页为准。

## 付费但便宜

### DeepSeek V4.1 Flash 配主流 harness

DeepSeek V4.1 Flash（API 名 `deepseek-flash`）是当前最便宜的可用编码模型之一。官方定价见 [模型 & 价格](https://api-docs.deepseek.com/zh-cn/quick_start/pricing/)，国内站按人民币计费。

- 上下文 1M，最大输出 384K，原生支持图片输入，支持 thinking 与非 thinking 模式。
- 非峰时缓存未命中输入 1 元 / 1M tokens，输出 4 元 / 1M tokens；峰时为北京时间周一到周五 09:00–12:00 与 14:00–18:00，峰时单价翻倍，闲时半价，周末与节假日全天按非峰时计费。
- 缓存命中输入约 0.02 元 / 1M tokens，比未命中低一个数量级以上，长会话与仓库级任务适合开缓存。

同一个模型在不同 harness 里的配置难度和实际效果差别不小，综合排序如下：

| 排序 | harness                             | 配置难度 | 使用效果 | 说明                                                                                                               |
| ---- | ----------------------------------- | -------- | -------- | ------------------------------------------------------------------------------------------------------------------ |
| 1    | Claude Code / Claude 桌面端         | 低       | 最好     | CLI 把变量写进 `settings.json` 的 `env` 块，删掉即恢复，不污染 shell；桌面端在开发者模式的第三方推理里填地址与 Key |
| 2    | Codex（CLI、桌面端与 VS Code 插件） | 最低     | 好       | 一键脚本写 `~/.codex/config.toml`，三端共用一份；DeepSeek 侧没有联网搜索，要把 `web_search` 关掉                   |
| 3    | OpenCode                            | 低       | 中       | `/connect` 选 DeepSeek 填 Key，与 Zen 免费模型共用同一套 provider 配置                                             |
| 4    | Kimi Code（CLI 与桌面端）           | 最低     | 中       | DeepSeek 是预置供应商，模型列表里直接选再填 Key                                                                    |
| 5    | Qoder CN                            | 低       | 中       | 预置供应商，或按 OpenAI Compatible 自定义模型；自定义模型由服务商 API 账户结算，不消耗 Credits                     |

配置细节列在下面：前两家给出可以直接照抄的内容，其余三家在界面里选 DeepSeek 填 Key 即可。

**Claude Code**：DeepSeek 提供 Anthropic 兼容端点 `https://api.deepseek.com/anthropic`。变量不要写进 shell 配置文件（`~/.bashrc`、PowerShell 的 Profile）：它们会作用于所有终端和所有项目，之后换回官方登录时容易忘掉，出问题时也难定位。写进 Claude Code 自己的配置文件更干净，删掉 `env` 块就等于恢复原状：

- 用户级 `~/.claude/settings.json`：对所有项目生效
- 项目级 `.claude/settings.json`，或只在本机生效的 `.claude/settings.local.json`：只在某个仓库里生效
- 只想临时试一次：`claude --settings <配置文件路径>`

```json
{
  "env": {
    "ANTHROPIC_BASE_URL": "https://api.deepseek.com/anthropic",
    "ANTHROPIC_AUTH_TOKEN": "<你的 DeepSeek API Key>",
    "ANTHROPIC_MODEL": "deepseek-flash[1m]",
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "deepseek-flash[1m]",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "deepseek-flash[1m]",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "deepseek-flash",
    "CLAUDE_CODE_SUBAGENT_MODEL": "deepseek-flash",
    "CLAUDE_CODE_EFFORT_LEVEL": "max",
    "CLAUDE_CODE_AUTO_COMPACT_WINDOW": "786432"
  }
}
```

变量名与取值来自 DeepSeek 官方的 [Integrate with Claude Code](https://api-docs.deepseek.com/quick_start/agent_integrations/claude_code)，官方给的是 shell 写法，改成上面的 `env` 块即可。

**Claude 桌面端**：桌面端不需要改配置文件，用客户端自带的第三方推理入口。先停在登录页别点继续，打开左上角菜单 Help → Troubleshooting → Enable developer mode，再进 Developer → Configure third-party inference，Gateway Base URL 填 `https://api.deepseek.com/anthropic`，API Key 填 DeepSeek 的 Key，选 Apply locally，客户端会自动重启生效。要改回官方登录，回到同一个位置把这份配置重置掉即可，过程见[这篇图文步骤](https://cloud.tencent.com/developer/article/2667350)。

**Codex**：DeepSeek 原生支持 Responses API，官方一键脚本会备份原配置并写入 `~/.codex/models.json` 与 `config.toml`。手动配置时在 `config.toml` 里改成：

```toml
model = "deepseek-flash"
model_provider = "deepseek"
preferred_auth_method = "apikey"
forced_login_method = "api"
model_reasoning_effort = "high"
web_search = "disabled"
model_catalog_json = "~/.codex/models.json"

[model_providers.deepseek]
name = "deepseek"
base_url = "https://api.deepseek.com/"
wire_api = "responses"
experimental_bearer_token = "<你的 DeepSeek API Key>"
```

桌面端与 VS Code 插件读同一份配置，改完重启应用即生效，不需要单独设置。做法见 [Integrate with Codex](https://api-docs.deepseek.com/quick_start/agent_integrations/codex)。

### OpenCode Go

不想调 Key 的人看 [Go](https://opencode.ai/docs/go)。$10 / 月订阅，拿到一批开源编码模型，含 DeepSeek V4.1 Flash、Kimi K2.7 Code、Qwen、GLM、MiniMax、Muse Spark Contributor 等。

限额按美元用量折算：约 5 小时 $12、每周 $30、每月 $60。模型越便宜，同样的钱能跑的请求数越多。超限后可以继续用免费模型，或打开余额兜底。

### Qoder CN 订阅

想要 IDE 形态的人看 [Qoder CN 计费说明](https://docs.qoder.cn/product-overview/billing-description)。社区版免费，含 300 Credits 与 2 周 Pro 试用；专业版 59 元 / 月含 2000 Credits，高级版 169 元 / 月含 6000 Credits，旗舰版 559 元 / 月含 20000 Credits，年付九折。一份订阅在 Qoder CN 的 IDE、插件、CLI、Mobile 之间共用 Credits。

Qwen3.7-Max、Qwen3.7-Plus 与 Qwen3.8-Max 有错峰折扣：北京时间每日 22:00 至次日 08:00，Credits 按 2 折或 4 折计量，折扣消耗的 Credits 仍计入月度额度。额度用完可以买资源包（40 元 / 1000 Credits，1 个月有效），或者按上一节的做法挂自定义模型，走服务商 API 账户结算。

## 用量大的包月包量

### 阿里云百炼 Token Plan

一份订阅通吃 Claude Code、Codex、Qwen Code、Qoder CN、Cursor、OpenClaw 等工具，按 Credits 统一抵扣。文档见 [Token Plan 概述](https://help.aliyun.com/zh/model-studio/token-plan-overview)。目前仅支持中国（北京）地域，控制台左上角切到该地域再购买。

- 个人版按 7 天窗口限额：Lite 限时 39 元 / 月（7 天 2500 Credits），Standard 限时 139 元 / 月（7 天 10000 Credits），Pro 限时 499 元 / 月（7 天 40000 Credits），另有 100 元 / 20000 Credits 的用量包。
- 团队版按月总额度结算，没有 7 天窗口：标准坐席限时 150 元 / 坐席 / 月（25000 Credits），高级坐席限时 550 元 / 坐席 / 月（100000 Credits），Max 坐席 1398 元 / 坐席 / 月（250000 Credits）。
- 个人版触顶会暂停服务，等窗口重置或买用量包；团队版在同一订阅月内累计，月初按订阅日重置。

Coding Plan 是另一条独立产品线，按调用次数计费。Coding Plan Lite 已停售，Pro 限量。官方当前推荐 Token Plan，新购以 Token Plan 为准。

### ChatGPT Plus / Pro 含 Codex

Codex 包含在 ChatGPT 订阅里，网页、CLI、IDE 插件、iOS 共用额度。定价见 [Codex Pricing](https://developers.openai.com/codex/pricing)。

- Plus $20 / 月：适合每周几次专注编码，GPT-5.6 Luna 额度最宽松，Sol / Terra 额度较紧，另有 5 小时与每周两层限额。
- Pro $100 / 月起：Plus 的 5 倍或 20 倍用量，适合每天长时间跑 agent。
- 用量取决于模型、任务规模、上下文与工具调用，消息条数只是估算。超限后可买 credits、等重置或升级。

### Copilot 付费档

看 [Copilot 个人计划](https://docs.github.com/en/copilot/concepts/billing/individual-plans)：Pro $10 / 月，Pro+ $39 / 月，Max $100 / 月，按 GitHub AI Credits 结算。

## 怎么选

- 先零成本把工作流跑通：OpenCode Zen 免费模型写一个小需求，WorkBuddy 体验版在 IDE 里补全同一段代码，对比哪个顺手。
- 再按量验证：充少量 DeepSeek 余额，分别在 Claude Code 与 Codex 里跑一周真实任务，哪个中断少就留哪个。
- 用量稳定后再上订阅：单人看百炼 Token Plan 个人版、Qoder CN 或 ChatGPT Plus，团队看百炼 Token Plan 团队版。
- 隐私红线：免费模型与 contributor 档会拿数据改进模型，课程设计、毕设核心代码、含密钥的仓库不要走这类通道。
- 链接有效期：本站外链在 2026 年 9 月 20 日逐条点开确认过。价格页更新频繁，下单前重新打开官方定价页对一遍。
