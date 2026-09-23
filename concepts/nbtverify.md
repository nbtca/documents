---
maintainers:
  - user: m1ngsama
    since: 2026-09
---

# nbtverify

nbtverify 是 NBTCA 开发的[校园网认证](./campus-network-auth)命令行工具，用 Go 编写，替代在浏览器认证页上手动登录：路由器、服务器、树莓派这类没有浏览器或需要常年在线的设备，可以用它自动完成认证、掉线自动重连。配套的 [luci-app-nbtverify](https://github.com/nbtca/luci-app-nbtverify) 把它打包成 OpenWrt 插件，在路由器的网页后台里就能配置。

<FactStrip :facts="[
  { label: '技术', value: 'Go · OpenWrt LuCI' },
  { label: '最新版', value: 'v0.1.9' },
  { label: '始于', value: '2024 年' },
  { label: '维护', value: 'LazuliKao' },
]" />

## 用法

从 [Releases](https://github.com/nbtca/nbtverify/releases) 下载对应平台的压缩包，解压后同一目录里有程序、`config.json` 样例和一个空的 `url.txt`。填好 `config.json` 里的学号和密码：

```json
{
  "username": "学号",
  "password": "密码",
  "ping_url": "http://www.nbt.edu.cn/",
  "cache": "url.txt"
}
```

- `nbtverify login`：登录，已在线时不重复登录；
- `nbtverify logout`：下线；
- `nbtverify relogin`：先下线再登录；
- `nbtverify service`：常驻运行，每秒检测一次网络，掉线后自动重新登录。

几个常用参数：`-c` 指定配置文件；`-mobile=false` 改为以电脑身份登录，默认以手机身份；`-f` 在检测不到认证页时，改用 `url.txt` 里缓存的认证地址强制登录。

在程序所在目录运行最稳妥：缓存文件 `url.txt` 必须事先存在，不存在时登录会直接失败。

## 工作原理

学校的认证门户由卓智网络提供，nbtverify 模拟浏览器走完同样的流程：

1. 访问 `ping_url`。没有认证时，门户会返回一段跳转到认证页的脚本，从中取出认证地址；能正常打开就说明已经在线；
2. 打开认证页，读取登录表单里的全部字段，填入学号和密码后提交；
3. 登录成功后读取详情页，拿到欢迎语、套餐、本机 IP 和 MAC 地址等信息；
4. 下线时提交详情页里的隐藏表单。

“手机身份”和“电脑身份”的区别只在请求头里的 User-Agent：一个模拟 iPhone 上的浏览器，一个模拟 Windows 上的 Chrome。

## OpenWrt 插件

luci-app-nbtverify 为 OpenWrt 各主流 CPU 架构提供 `.ipk` 安装包，共 28 个。先确认路由器的架构，安装 `luci-compat`，再装对应的包；装好后在 LuCI 后台的“服务 › NBT Verify”里填写学号密码、勾选启用，保存后服务由 procd 托管，异常退出会自动重启。页面上会实时显示登录状态、校园网 IP 和 MAC 地址。

## 参与开发

```bash
git clone https://github.com/nbtca/nbtverify.git
cd nbtverify
go build .
```

`Makefile.cross-compiles` 一次交叉编译 Windows、macOS、Linux 和 FreeBSD 共 16 个平台，Linux 版覆盖 x86、ARM、MIPS 和 RISC-V；打 tag 后由 [GoReleaser](https://goreleaser.com/) 发布。luci-app 的界面是 Lua 写的 LuCI 页面，打包脚本 `tools/pack.fsx` 是 F#：它下载 nbtverify 最新的 Release，为每个 OpenWrt 架构手工拼出一个 `.ipk`。

学校更换认证系统或者改了认证页，这个工具就会失效，这时最需要有人抓包、对照新页面修改。平时也有不需要校园网就能做的：

- 让配置文件里的 `mobile` 字段生效，现在只有命令行参数 `-mobile` 起作用；
- 缓存文件不存在时自动创建；
- 给 HTTP 请求加超时，并修复网络出错时的空指针崩溃；
- 把 README 补全，现在只写了 `-c` 一个参数。

需要先讨论的：luci-app 目前打包的是 `.ipk`，而新版 OpenWrt 已改用 apk 包管理器；密码经命令行参数传给程序，在进程列表里可见。

〔**最后核对 2026-09**：两个仓库的最新版本都是 2024 年 11 月发布的 v0.1.9。〕

维护者是 [LazuliKao](https://github.com/LazuliKao)。仓库地址：[github.com/nbtca/nbtverify](https://github.com/nbtca/nbtverify)。

## 沿革

nbtverify 于 2024 年 5 月发布第一个版本，同月修复了教学区认证地址解析的问题；luci-app 于 2024 年 10 月发布，11 月两者同步更新到 v0.1.9。

[2026 年 9 月的新学期招新交流会](/archived/2026/2026-09-02-recruitment-meeting)整理新人感兴趣的话题时，把“nbt 校园网自动登录”列为推荐给新人的开源项目之一。

## 相关

其他项目见[基础设施与项目](/about/infrastructure)。
