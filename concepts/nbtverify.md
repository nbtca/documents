---
maintainers:
  - user: m1ngsama
    since: 2026-09
---

# nbtverify

nbtverify 是 NBTCA 开发的[校园网认证](./campus-network-auth)命令行工具，用 Go 编写，替代在浏览器认证页上手动登录：路由器、服务器、树莓派这类没有浏览器或需要常年在线的设备，可以用它自动完成认证。配套的 [luci-app-nbtverify](https://github.com/nbtca/luci-app-nbtverify) 把它打包成 OpenWrt 插件，在路由器的网页后台里就能配置。

## 用法

从 [Releases](https://github.com/nbtca/nbtverify/releases) 下载对应平台的程序，写一个 `config.json`：

```json
{
  "username": "学号",
  "password": "密码",
  "mobile": true,
  "cache": "url.txt"
}
```

- `nbtverify login`：登录，已在线时不重复登录；
- `nbtverify logout`：下线；
- `nbtverify relogin`：先下线再登录；
- `nbtverify service`：常驻运行，每秒检测一次网络，掉线后自动重新登录。

`mobile` 决定以移动端还是电脑端的身份登录。`cache` 指定的文件会保存认证页地址，下次即使检测不到认证页也能用 `-f` 强制登录。

## 支持的平台

- **nbtverify**：Windows、macOS、Linux 和 FreeBSD，Linux 版覆盖 x86、ARM、MIPS 和 RISC-V 架构，能直接放进大多数路由器；
- **luci-app-nbtverify**：为 OpenWrt 各主流 CPU 架构提供 `.ipk` 安装包，安装后在 LuCI 后台填写学号密码、启用服务即可。

## 参与开发

```bash
git clone https://github.com/nbtca/nbtverify.git
cd nbtverify
go build .
```

`Makefile.cross-compiles` 一次交叉编译全部平台，打 tag 后由 [GoReleaser](https://goreleaser.com/) 发布。luci-app 的 LuCI 界面是 Lua 写的，打包与发布脚本是 F#。

学校更换认证系统或者改了认证页，这个工具就会失效，这时最需要有人抓包、对照新接口修改。

〔**最后核对 2026-09**：两个仓库的最新版本都是 2024 年 11 月发布的 v0.1.9。〕

维护者是 [LazuliKao](https://github.com/LazuliKao)。仓库地址：[github.com/nbtca/nbtverify](https://github.com/nbtca/nbtverify)。

## 相关

其他项目见[基础设施与项目](/about/infrastructure)。
