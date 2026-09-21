---
order: 18
maintainers:
  - user: Yuna-Celisse
    since: 2026-09
---

# 自建中转站（AxonHub）

用 Claude Code、Codex、Kimi Code 这类工具时，每换一个模型都要在每台机器、每个工具里改一遍地址和密钥；上游一多，密钥散落在各处，用量也看不到。中转站解决的就是这件事：自己跑一个网关，对外只暴露一个地址，把 DeepSeek、百炼、OpenAI 等上游收在它后面，工具端只填中转站的地址和一把 Key。

本文用 [AxonHub](https://github.com/looplj/axonhub) 搭。它对外同时提供 OpenAI 与 Anthropic 兼容接口，也就是同一个实例既能给 Codex、OpenCode 这类 OpenAI 系工具用，也能给 Claude Code 这类 Anthropic 系工具用。模型和工具本身怎么选见[模型与工具推荐](/tutorial/manual/model-agent-suggestions)，本文只讲怎么把中转站建起来、把工具接进来。

AxonHub 目前发布的都是 `v1.0.0-beta` 系列，还没有正式版；本文以 `v1.0.0-beta10` 为例。部署时锁定具体版本号，升级前先备份。

## 前置条件

- 一台能跑 Docker 与 Docker Compose v2 的机器（本文命令在 Linux 上验证过；Windows 用 Docker Desktop 或 WSL，注意卷路径）
- 至少一个上游服务商的 API Key，例如 DeepSeek 或阿里云百炼
- 先想清楚谁能访问：默认只监听 `127.0.0.1`，对外开放放到第五步再做

## 第一步：部署

取一份与要部署版本一致的 Compose 文件，不要凭记忆重写：

```bash
git clone --depth 1 --branch v1.0.0-beta10 https://github.com/looplj/axonhub.git
cd axonhub
cp config.example.yml config.yml
```

在同目录建 `.env`，并收紧权限：

```bash
chmod 600 .env
```

```dotenv
DB_PASSWORD=换成足够长的随机串
AXONHUB_IMAGE=looplj/axonhub:v1.0.0-beta10
POSTGRES_IMAGE=postgres:16-alpine
AXONHUB_BIND_ADDRESS=127.0.0.1
AXONHUB_HOST_PORT=8090
```

仓库里的 `docker-compose.yml` 把这几个值做成了必填：`DB_PASSWORD`、`AXONHUB_IMAGE`、`POSTGRES_IMAGE` 缺一个，Compose 会直接拒绝启动。PostgreSQL 只挂在内部的 `axonhub-backend` 网络上，AxonHub 另接一张 `axonhub-egress` 出去访问上游；端口映射默认是 `127.0.0.1:8090:8090`，也就是只有本机能连。

```bash
docker compose --env-file .env config --quiet
docker compose --env-file .env pull
docker compose --env-file .env up -d
docker compose --env-file .env ps
curl --fail --silent --show-error http://127.0.0.1:8090/health
```

`/health` 通过才算部署成功——进程跑着、`ps` 显示 healthy，都不等于服务可用。出问题先看 `docker compose --env-file .env logs --tail=100 axonhub`。

只想先跑起来看看，可以用同一份 Compose 里注释掉的 SQLite 服务替代 PostgreSQL，省一个容器；它只适合单进程、单实例，常驻使用仍然建议 PostgreSQL。

## 第二步：初始化并添加上游

浏览器打开 `http://127.0.0.1:8090`，首次进入会要求创建管理员账号。这里没有默认账号密码，别拿演示站的那组来试自己的实例。

登录后在 **Channels（渠道）** 里添加上游：

- **类型**选服务商，列表里有 DeepSeek、OpenAI、Anthropic、智谱、Moonshot、Gemini、OpenRouter 等，选不到就用 OpenAI 兼容类型
- **API Key** 填该服务商的 Key；同一个渠道可以逐行填多把 Key，AxonHub 会轮流使用，单把 Key 限流时能顶一阵
- **支持的模型**填要对外暴露的模型名
- 先点**测试**，通过后再**启用**，没启用的渠道不会接到流量

接国内上游时，Base URL 按各家官方文档填；只有 OpenAI 兼容端点的服务商，类型要选 OpenAI 兼容而不是它自家的类型。

## 第三步：对外地址与 API Key

在 **API Keys（API 密钥）** 里创建一把给客户端用的 Key（默认前缀 `ah`），它就是工具配置里要填的那个值。之后对外只有两个地址：

| 协议 | 地址 | 给谁用 |
| --- | --- | --- |
| OpenAI 兼容 | `http://<中转站地址>:8090/v1` | Codex、OpenCode、Kimi Code、Qoder CN 等 |
| Anthropic 兼容 | `http://<中转站地址>:8090/anthropic` | Claude Code、Claude 桌面端 |

如果客户端请求的模型名和上游不一致，用 **Model Profiles（模型配置文件）** 做映射，支持按名称或正则，改完把配置文件绑到 API Key 上。这样工具端始终请求 `claude-sonnet-4-5` 这类熟悉的模型名，实际打到哪个上游由中转站决定，换供应商就不用动工具配置了。

## 第四步：把工具接过来

**Claude Code**：地址填 Anthropic 兼容入口，Key 填中转站的 Key。仍然写进 `settings.json` 的 `env` 块，不要写进 shell 配置文件——清理时只动这一个文件：

```json
{
  "env": {
    "ANTHROPIC_BASE_URL": "http://<中转站地址>:8090/anthropic",
    "ANTHROPIC_AUTH_TOKEN": "<你的 AxonHub API Key>"
  }
}
```

**Claude 桌面端**：走客户端自带的第三方推理，Developer → Configure third-party inference，Gateway Base URL 填同一个 `/anthropic` 地址，API Key 填中转站的 Key。

**Codex**：在 `~/.codex/config.toml` 里把中转站注册成一个 provider：

```toml
model = "deepseek-flash"
model_provider = "axonhub-responses"

[model_providers.axonhub-responses]
name = "AxonHub"
base_url = "http://127.0.0.1:8090/v1"
env_key = "AXONHUB_API_KEY"
wire_api = "responses"
query_params = {}
```

`model` 写成中转站里已启用的模型名。然后在启动 Codex 的那个 shell 里 `export AXONHUB_API_KEY="<你的 AxonHub API Key>"`，重启 Codex 生效。`env_key` 填的是环境变量名而不是 Key 本身。

**OpenCode / Kimi Code / Qoder CN**：选 OpenAI 兼容的自定义供应商，Base URL 填 `/v1`，Key 填中转站的 Key。各家界面里的填法见[模型与工具推荐](/tutorial/manual/model-agent-suggestions)，只是把那里的 DeepSeek 官方地址换成本文的中转站地址。

## 第五步：对外开放与访问控制

默认只有本机能连。要给同一局域网或 Tailnet 里的设备用，按暴露面从小到大选一种：

1. **只给 Tailnet 里的设备用**：把 `AXONHUB_BIND_ADDRESS` 改成 Tailscale 网卡地址，再按 [Tailscale 使用指南](/tutorial/manual/tailscale-usage)把对端接进来。不要把端口直接映射到公网。
2. **本机反代 + TLS**：保持绑定在 `127.0.0.1`，前面放反向代理终止 TLS，并把 `server.trusted_proxies`、`ip_access_control.allowed_ips` 按实际环境配好。参见 [Nginx 使用指南](/tutorial/manual/nginx-usage)。
3. **SSH 隧道**：临时给一两台机器用，`ssh -N -L 8090:127.0.0.1:8090 <服务器>`，本机按 `http://127.0.0.1:8090` 访问。

几条底线：

- `server.api.auth.allow_no_auth` 保持关闭，否则任何人拿到地址就能白用你的额度
- Key 一人一把，不要多人共用，用量出问题时才定位得到人
- `config.yml`、`.env`、数据库卷都不要进仓库，`.env` 权限收到本人可读
- 上游服务商的条款和风控由部署者自己承担。把 Claude Code 这类订阅当作上游渠道再对外分发，AxonHub 官方已声明不再重点维护该渠道，本文不展开

## 验证与日常维护

- **连通**：先看 AxonHub 的 **Traces（追踪）** 页面有没有请求进来，比在客户端反复改配置猜要快
- **用量**：**Requests（请求监控）** 与成本追踪能按 Key、按渠道看消耗，这是自建中转站相对各家官方后台最直接的收益
- **缓存命中**：打开 `server.trace.claude_code_trace_enabled` 或 `codex_trace_enabled` 后，同一次会话的请求会归并到一条 Trace，并优先打到同一个上游渠道，能提高上游的缓存命中率
- **备份**：PostgreSQL 数据卷、`.env`、`config.yml` 三样一起备，恢复时版本要对得上
- **升级**：把 `AXONHUB_IMAGE` 改到目标版本 → `docker compose --env-file .env config --quiet` → `up -d` → 再看 `/health` 与日志。回滚就是把镜像引用改回去，数据库只有在确认不兼容时再动

## 常见问题

### 容器起来了，浏览器打不开

先看 `AXONHUB_BIND_ADDRESS`。默认 `127.0.0.1` 只有本机能连，从别的机器访问要么改绑定地址，要么走第五步的隧道或反代。

### 渠道测试失败

检查 Base URL 是不是服务商要求的完整地址（OpenAI 系通常要带 `/v1`），以及 Key 有没有该模型的权限。国内服务商只提供 OpenAI 兼容端点时，类型选 OpenAI 兼容。

### Claude Code 连不上

确认 `ANTHROPIC_BASE_URL` 指向中转站的 `/anthropic`，以及 `ANTHROPIC_AUTH_TOKEN` 填的是中转站 Key 而不是上游 Key。中转站用了自签名证书的，先在系统里信任该证书。

### Codex 认证失败

`env_key` 指的那个环境变量必须和 Codex 在同一个 shell 会话里存在。Windows 上改系统环境变量后要重开终端。

### 换上游要改哪些地方

渠道里加一条、测试通过后启用即可，工具端不用动——前提是模型名已经通过 Model Profile 映射过。这一层存在的意义就是让「换供应商」和「改客户端配置」脱钩。
