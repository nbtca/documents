# 社团自建 Tailscale 使用指南

:::info 维护信息

| 维护人 | 时间             |
| ------ | ---------------- |
| @LazuliKao    | 2025.11.3 - Now |

:::

## 什么是 Tailscale

Tailscale 是一个基于 WireGuard 的零配置虚拟组网服务，它可以让你在任何地方都能安全地访问计协内部的服务。社团自建的 Tailscale 服务（基于开源的 Headscale）提供了一个私有的、安全的虚拟组网解决方案。

### 主要功能和优势

- **简单易用**：只需安装客户端并登录即可连接到虚拟网络
- **身份验证**：接入NBTCA的账号进行身份验证，确保只有社团成员可以访问
- **安全加密**：基于 WireGuard 协议，提供军事级别的加密保护
- **零配置**：无需配置防火墙规则或端口转发，开箱即用
- **跨平台**：支持 Windows、macOS、Linux、Android、iOS 等多个平台
- **点对点连接**：设备之间可以直接通信，延迟更低
- **ACL 访问控制**：可以精确控制哪些设备可以访问哪些服务
- **中转节点**：由多位成员提供的中转节点，在无法P2P连接时提供流量中转服务

### 使用场景

1. **远程访问社团服务器**：在家里或宿舍访问社团的文件服务器、校园网内网网站等
2. **文件共享**：在不同设备间安全地共享文件
3. **开发测试**：让团队成员可以访问开发环境和测试服务器
4. **游戏联机**：通过虚拟网络进行局域网游戏联机

## 准备工作

在开始使用之前，你需要：

1. 注册NBTCA账号：<https://myid.app.nbtca.space/>
2. 使用自己的账号登录 Headscale 管理面板: <https://headscale.app.nbtca.space/admin>
3. 在你的设备上安装 Tailscale 客户端

## 不同设备的使用方式

### Windows

1. **下载安装包**

   访问 [Tailscale 官网](https://tailscale.com/download/windows) 下载 Windows 安装包。

2. **安装 Tailscale**

   双击下载的安装包，按照提示完成安装。完成后不用点击登录按钮。

3. **配置 Headscale 服务器**

   安装完成后，打开命令提示符（CMD）或 PowerShell，运行以下命令：

   ```powershell
   tailscale up --login-server=https://headscale.app.nbtca.space
   ```

4. **完成认证**

   浏览器会自动打开认证页面，按照页面提示完成认证即可。

### macOS

1. **下载安装包**

   访问 [Tailscale 官网](https://tailscale.com/download/mac) 下载 macOS 安装包，或使用 Homebrew：

   ```bash
   brew install tailscale
   ```

2. **启动 Tailscale**

   如果使用 Homebrew 安装，需要先启动服务：

   ```bash
   sudo tailscaled install-system-daemon
   ```

3. **配置 Headscale 服务器**

   打开终端，运行：

   ```bash
   tailscale login --login-server=https://headscale.app.nbtca.space
   ```

4. **完成认证**

   浏览器会自动打开认证页面，按照提示完成认证。

### Linux

1. **安装 Tailscale**

   根据你的发行版选择对应的安装方式：

   #### Ubuntu / Debian

   ```bash
   curl -fsSL https://tailscale.com/install.sh | sh
   ```

   #### Arch Linux

   ```bash
   sudo pacman -S tailscale
   ```

   #### Fedora

   ```bash
   sudo dnf install tailscale
   ```

2. **启动服务**

   ```bash
   sudo systemctl enable --now tailscaled
   ```

3. **配置 Headscale 服务器**

   ```bash
   sudo tailscale login --login-server=https://headscale.app.nbtca.space
   ```

4. **完成认证**

   终端会显示一个 URL，在浏览器中打开该 URL 完成认证。

### Android

1. **安装应用**

   在 Google Play 商店搜索 "Tailscale" 并安装，或从 [F-Droid](https://f-droid.org/) 下载开源版本。

2. **配置自定义服务器**

   - 打开 Tailscale 应用
   - 点击右上角的设置图标（三个点）
   - 选择 "Use custom control server"
   - 输入社团提供的 Headscale 服务器地址
   - 点击 "Sign in"

3. **完成认证**

   应用会打开浏览器进行认证，按照提示完成即可。

### iOS

1. **安装应用**

   在 App Store 搜索 "Tailscale" 并安装。

2. **配置自定义服务器**

   - 打开 Tailscale 应用
   - 点击右上角的设置图标（齿轮）
   - 点击账户 `Accounts`
   - 选择 "Use custom coordination server"
   - 输入社团提供的 Headscale 服务器地址 `https://headscale.app.nbtca.space`
   - 点击 "Sign in"

## 使用 Docker Compose 部署

如果你想在服务器上使用 Docker Compose 运行 Tailscale 客户端，可以参考以下配置：

### 基本配置

创建一个 `docker-compose.yml` 文件：

```yaml
version: '3'

services:
  tailscale:
    image: ghcr.io/tailscale/tailscale:latest
    container_name: tailscale
    hostname: tailscale-docker
    volumes:
      - ./tailscale-data:/var/lib/tailscale # 存储 state，保持登录状态
      - /var/run/tailscale:/var/run/tailscale
    # # 取消下面这段的注释让宿主机也可以直接使用虚拟网络
    #   - /lib/modules:/lib/modules:ro
    #   - /dev/net/tun:/dev/net/tun # TUN 设备访问
    # privileged: true # tailscale 需要特权模式才能配置网络接口
    # devices:
    #   - /dev/net/tun:/dev/net/tun
    # cap_add:
    #   - NET_ADMIN
    #   - SYS_MODULE
    #   # https://github.com/wg-easy/wg-easy/issues/1554
    #   - NET_RAW
    # network_mode: host # tailscale 直接控制宿主网络（可选）
    environment:
      # TS_AUTHKEY: xxx # 如果使用预注册密钥，可在注册账号后联系管理员获取
      TS_EXTRA_ARGS: --advertise-tags=tag:container --login-server=https://headscale.app.nbtca.space
      TS_STATE_DIR: /var/lib/tailscale
      TS_SOCKET: /var/run/tailscale/tailscaled.sock
      TS_USERSPACE: false # 如果遇到问题可以尝试改成true，但性能会差一些，false即运行在内核模块 
      TS_HOSTNAME: xxx-docker # 你的设备名称 建议修改
      TS_DEBUG_FIREWALL_MODE: nftables # 如果操作系统的防火墙使用的是iptables，请去掉这一行
      TZ: Asia/Shanghai
    healthcheck:
      test:
        [
          "CMD-SHELL",
          'tailscale status --json | grep -q ''"BackendState": "Running"''',
        ]
    restart: unless-stopped
# # 可选：部署 DERP 中转服务器，如果你运行在公网服务器并且带宽足够大，贡献给社团
#   derp-server:
#     container_name: tailscale-derp
#     image: ghcr.io/nbtca/tailscale-derp:edge
#     network_mode: host
#     depends_on:
#       tailscale:
#         condition: service_healthy
#     environment:
#       TZ: Asia/Shanghai
#       DERP_HOST: "公网IP或域名"
#       DERP_PORT: 10086
#       STUN_PORT: 10086
#       HTTP_PORT: -1
#       VERIFY_CLIENTS: true
#     volumes:
#       - /var/run/tailscale:/var/run/tailscale
#     restart: unless-stopped
```

### 启动服务

```bash
# 创建状态目录
mkdir -p tailscale-state

# 启动容器
docker-compose up -d

# 查看日志
# 比如手动登录的时候可以进入查看登录链接，复制后在浏览器中打开
docker-compose logs -f tailscale
```

## 常见问题

### 获取认证密钥

通常不需要使用pre auth key，正常启动会跳转使用统一身份认证，如有需要请在连接一台设备后，联系社团管理员获取预注册密钥（Pre-auth key）。

## 进阶使用

### 子网路由

如果你想让 Tailscale 网络中的其他设备访问你本地的子网（例如 `192.168.1.0/24`），可以启用子网路由：（注意启动后需要管理员去后台批准，且不能与已有子网重复）

```bash
# 在 Linux 上
sudo tailscale up --advertise-routes=192.168.1.0/24 --login-server=https://headscale.app.nbtca.space

# 在 Docker 中
# 在 docker-compose.yml 的 TS_ROUTES 环境变量中设置
TS_ROUTES=192.168.1.0/24
```

然后需要管理员在 Headscale 服务器上批准路由：

```bash
headscale routes enable -i <node-id> -r 192.168.1.0/24
```

## 相关链接

- [Tailscale 官方文档](https://tailscale.com/kb/)
- [Headscale 项目地址](https://github.com/juanfont/headscale)
- [WireGuard 协议介绍](https://www.wireguard.com/)

## 总结

通过社团自建的 Tailscale 网络，我们可以更方便、更安全地访问社团的各种资源。如果你在使用过程中遇到任何问题，欢迎在社团群里提问或联系管理员寻求帮助！

祝你使用愉快！🎉
