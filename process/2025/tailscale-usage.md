# 社团自建 Tailscale 使用指南

:::info 维护信息

| 维护人 | 时间             |
| ------ | ---------------- |
| @AI    | 2025.10.31 - Now |

:::

## 什么是 Tailscale

Tailscale 是一个基于 WireGuard 的零配置 VPN 服务，它可以让你在任何地方都能安全地访问你的设备和服务。社团自建的 Tailscale 服务（基于开源的 Headscale）为我们提供了一个私有的、安全的内网穿透解决方案。

### 主要功能和优势

- **内网穿透**：让你在校外也能访问社团内网的服务和设备
- **安全加密**：基于 WireGuard 协议，提供军事级别的加密保护
- **零配置**：无需配置防火墙规则或端口转发，开箱即用
- **跨平台**：支持 Windows、macOS、Linux、Android、iOS 等多个平台
- **点对点连接**：设备之间可以直接通信，延迟更低
- **ACL 访问控制**：可以精确控制哪些设备可以访问哪些服务

### 使用场景

1. **远程访问社团服务器**：在家里或宿舍访问社团的 Git 服务器、内网网站等
2. **文件共享**：在不同设备间安全地共享文件
3. **开发测试**：让团队成员可以访问开发环境和测试服务器
4. **远程维修**：远程协助修理电脑或调试问题

## 准备工作

在开始使用之前，你需要：

1. 获取社团 Headscale 服务器的地址（向管理员索取）
2. 获取预注册密钥（Pre-auth key）或注册权限（向管理员索取）
3. 在你的设备上安装 Tailscale 客户端

## 不同设备的使用方式

### Windows

1. **下载安装包**

   访问 [Tailscale 官网](https://tailscale.com/download/windows) 下载 Windows 安装包。

2. **安装 Tailscale**

   双击下载的安装包，按照提示完成安装。

3. **配置 Headscale 服务器**

   安装完成后，打开命令提示符（CMD）或 PowerShell，运行以下命令：

   ```powershell
   tailscale login --login-server=https://your-headscale-server.com
   ```

   将 `https://your-headscale-server.com` 替换为社团提供的 Headscale 服务器地址。

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
   tailscale login --login-server=https://your-headscale-server.com
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
   sudo tailscale login --login-server=https://your-headscale-server.com
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

   iOS 版本的 Tailscale 暂时不直接支持在应用内设置自定义服务器，需要通过配置描述文件的方式：

   - 联系管理员获取配置描述文件
   - 或使用 [Apple Configurator](https://support.apple.com/apple-configurator) 创建配置文件

   _注意：iOS 上使用自定义 Headscale 服务器相对复杂，建议优先使用其他平台。_

## 使用 Docker Compose 部署

如果你想在服务器上使用 Docker Compose 运行 Tailscale 客户端，可以参考以下配置：

### 基本配置

创建一个 `docker-compose.yml` 文件：

```yaml
version: '3'

services:
  tailscale:
    image: tailscale/tailscale:latest
    container_name: tailscale
    hostname: my-docker-host
    environment:
      - TS_AUTHKEY=tskey-auth-xxxxxxxxxxxxx # 替换为你的认证密钥
      - TS_STATE_DIR=/var/lib/tailscale
      - TS_USERSPACE=false
      - TS_ROUTES= # 可选：需要路由的子网
    volumes:
      - ./tailscale-state:/var/lib/tailscale
      - /dev/net/tun:/dev/net/tun
    cap_add:
      - NET_ADMIN
      - SYS_MODULE
    restart: unless-stopped
```

### 使用自定义 Headscale 服务器

修改 `docker-compose.yml`，添加登录服务器参数：

```yaml
version: '3'

services:
  tailscale:
    image: tailscale/tailscale:latest
    container_name: tailscale
    hostname: my-docker-host
    environment:
      - TS_AUTHKEY=tskey-auth-xxxxxxxxxxxxx
      - TS_STATE_DIR=/var/lib/tailscale
      - TS_USERSPACE=false
      - TS_EXTRA_ARGS=--login-server=https://your-headscale-server.com
    volumes:
      - ./tailscale-state:/var/lib/tailscale
      - /dev/net/tun:/dev/net/tun
    cap_add:
      - NET_ADMIN
      - SYS_MODULE
    restart: unless-stopped
```

### 启动服务

```bash
# 创建状态目录
mkdir -p tailscale-state

# 启动容器
docker-compose up -d

# 查看日志
docker-compose logs -f tailscale
```

### 与其他服务共享网络

如果你想让其他 Docker 容器通过 Tailscale 网络访问，可以使用网络共享：

```yaml
version: '3'

services:
  tailscale:
    image: tailscale/tailscale:latest
    container_name: tailscale
    hostname: my-docker-host
    environment:
      - TS_AUTHKEY=tskey-auth-xxxxxxxxxxxxx
      - TS_STATE_DIR=/var/lib/tailscale
      - TS_USERSPACE=false
      - TS_EXTRA_ARGS=--login-server=https://your-headscale-server.com
    volumes:
      - ./tailscale-state:/var/lib/tailscale
      - /dev/net/tun:/dev/net/tun
    cap_add:
      - NET_ADMIN
      - SYS_MODULE
    restart: unless-stopped

  app:
    image: your-app:latest
    container_name: app
    network_mode: 'service:tailscale' # 使用 Tailscale 的网络
    depends_on:
      - tailscale
```

## 常见问题

### 无法连接到 Headscale 服务器

1. 检查服务器地址是否正确
2. 确认服务器的防火墙是否开放了相应端口
3. 尝试使用 `ping` 或 `curl` 测试服务器的可达性

### 设备无法相互通信

1. 确认两台设备都已成功连接到 Tailscale 网络
2. 检查 ACL（访问控制列表）设置，确保设备有权限互相访问
3. 尝试使用 `tailscale ping` 命令测试连接

### Docker 容器启动失败

1. 确认宿主机已加载 `tun` 模块：`modprobe tun`
2. 检查容器是否有足够的权限（`NET_ADMIN` 和 `SYS_MODULE`）
3. 查看容器日志：`docker-compose logs tailscale`

### 获取认证密钥

联系社团管理员获取预注册密钥（Pre-auth key），或申请注册权限。

## 进阶使用

### 子网路由

如果你想让 Tailscale 网络中的其他设备访问你本地的子网（例如 `192.168.1.0/24`），可以启用子网路由：

```bash
# 在 Linux 上
sudo tailscale up --advertise-routes=192.168.1.0/24 --login-server=https://your-headscale-server.com

# 在 Docker 中
# 在 docker-compose.yml 的 TS_ROUTES 环境变量中设置
TS_ROUTES=192.168.1.0/24
```

然后需要管理员在 Headscale 服务器上批准路由：

```bash
headscale routes enable -i <node-id> -r 192.168.1.0/24
```

### 退出节点

退出节点（Exit Node）允许你的流量通过 Tailscale 网络中的另一台设备转发，类似于传统 VPN：

```bash
# 将设备设置为退出节点
sudo tailscale up --advertise-exit-node --login-server=https://your-headscale-server.com

# 使用退出节点
sudo tailscale up --exit-node=<exit-node-ip> --login-server=https://your-headscale-server.com
```

## 相关链接

- [Tailscale 官方文档](https://tailscale.com/kb/)
- [Headscale 项目地址](https://github.com/juanfont/headscale)
- [WireGuard 协议介绍](https://www.wireguard.com/)

## 总结

通过社团自建的 Tailscale 网络，我们可以更方便、更安全地访问社团的各种资源。如果你在使用过程中遇到任何问题，欢迎在社团群里提问或联系管理员寻求帮助！

祝你使用愉快！🎉
