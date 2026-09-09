---
order: 11
maintainers:
  - user: m1ngsama
    since: 2026-09
---

# 包管理器与 Node 工具链

本文讲包管理器解决什么问题、系统级与语言级两层各自的模型、版本锁定的几个字段，以及本仓库所需工具链在不同 Node 版本下的正确装法。结论都链到对应的官方文档。

## 包管理器解决什么

手动下载安装包会遇到三件事：这个软件还需要哪些别的软件（依赖）、装的是哪个版本（版本）、换台机器能不能装出一模一样的结果（可重现）。包管理器就是把这三件事自动化。

它同时带来一个副作用，是新人最常困惑的地方：软件被装到包管理器自己的目录下，要能在终端直接敲出命令，那个目录必须在 `PATH` 里——机制见[终端、shell 与 PATH](/tutorial/terminal-shell-and-path#shell-怎么找到一个命令)。

## 系统级包管理器

管理整台机器上的软件。各系统的主流实现：

| 系统            | 包管理器                                                                                                                     |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Debian / Ubuntu | [dpkg](https://www.debian.org/doc/manuals/debian-faq/pkgtools.en.html) 与其上层 apt                                          |
| Fedora / RHEL   | rpm 与其上层 dnf                                                                                                             |
| Arch Linux      | [pacman](https://wiki.archlinux.org/title/Pacman)                                                                            |
| macOS           | [Homebrew](https://docs.brew.sh/)、MacPorts                                                                                  |
| Windows         | [Scoop](https://github.com/ScoopInstaller/Scoop)、Chocolatey、[winget](https://learn.microsoft.com/windows/package-manager/) |

### Homebrew 的前缀

Homebrew 把所有东西装进一个前缀目录，[安装文档](https://docs.brew.sh/Installation)说明：

> The script installs Homebrew to its default prefix (`/opt/homebrew` for Apple Silicon, `/usr/local` for macOS Intel and `/home/linuxbrew/.linuxbrew` for Linux) so that you don't need `sudo` after Homebrew's initial installation when you `brew install`.

装完后要执行 `brew shellenv` 把该前缀下的 `bin` 加进 `PATH`，这条通常写进 `.zprofile`——为什么是 `.zprofile` 而不是 `.zshrc`，见[启动文件的读取顺序](/tutorial/terminal-shell-and-path#配置写了却不生效)。

前缀有两个：Apple Silicon 是 `/opt/homebrew`，Intel 是 `/usr/local`。同一台机器上两者可能都存在（比如从 Intel 迁移过来），此时 `PATH` 顺序决定了 `brew` 到底跑的是哪一个，用 `command -v brew` 确认。

### Scoop 的取向

Scoop 面向 Windows，[它自己的说明](https://github.com/ScoopInstaller/Scoop#what-does-scoop-do)列出的目标包括免去 UAC 弹窗、跳过向导式安装界面、以及避免污染 `PATH` 环境变量。它把每个应用装在自己的目录里，用 shim 统一暴露命令。

## 语言级：Node 工具链

系统级管的是机器上的软件，语言级管的是一个项目的依赖。Node 生态里有三个：

- **npm**：随 Node.js 一起分发，装完 Node 就有；
- **Yarn**：[2016 年 10 月 11 日发布](https://classic.yarnpkg.com/blog/2016/10/11/introducing-yarn/)，主打确定性安装与 lockfile；
- **pnpm**：本仓库使用的。

pnpm 的差别在磁盘布局。[它的设计说明](https://pnpm.io/motivation)写道：

> When packages are installed, their files are hard-linked from that single place, consuming no additional disk space. This allows you to share dependencies of the same version across projects.

也就是所有版本只在全局存一份，项目里的 `node_modules` 用硬链接指过去。同一份文档还指出，npm 与 Yarn Classic 会把所有包提升（hoist）到 `node_modules` 根部，导致代码能引用到并未声明为依赖的包；pnpm 默认不这么做。

## 版本锁定的几个字段

| 位置                                                                             | 作用                                                                      |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `dependencies` 里的版本范围                                                      | 声明能接受哪些版本，语法遵循 [语义化版本](https://semver.org/lang/zh-CN/) |
| `pnpm-lock.yaml`                                                                 | 记录这次实际装了哪些确切版本，保证换台机器结果一致                        |
| [`engines`](https://docs.npmjs.com/cli/v11/configuring-npm/package-json#engines) | 声明项目要求的 Node 与包管理器版本                                        |
| `packageManager`                                                                 | 指定用哪个包管理器的哪个版本，由 Corepack 读取                            |

`packageManager` 字段的格式见 [Corepack 文档](https://github.com/nodejs/corepack#when-authoring-packages)：值形如 `pnpm@9.0.0`，`名称@x.y.z` 是必需的，后面可以附一段哈希用于校验。

安装时用 `pnpm install --frozen-lockfile`，它要求 lockfile 与 `package.json` 一致，不一致就报错而不是悄悄改写——CI 和多人协作都应该用这个而不是裸的 `pnpm install`。

## Corepack 现在不随 Node 分发了

Corepack 是读取 `packageManager` 字段、自动调用对应包管理器版本的工具。它的分发状态在 2025 年变了，[官方 README](https://github.com/nodejs/corepack) 的原话是：

> Corepack is distributed with Node.js from version 14.19.0 up to (but not including) 25.0.0.

一个旁证：`https://nodejs.org/api/corepack.html` 现在返回 308，跳转到上面那个 GitHub 仓库——Node 官网上已经不再托管这份文档。

因此网上大量教程里那句“直接 `corepack enable` 就行”不再普遍成立，得看 Node 版本：

| Node 版本      | corepack 是否自带 | 装 pnpm 的做法                                                  |
| -------------- | ----------------- | --------------------------------------------------------------- |
| 14.19.0 – 24.x | 是                | `corepack enable`                                               |
| 25.0.0 及以后  | 否                | `npm install -g corepack` 后再 `corepack enable`，或直接装 pnpm |

先确认自己在哪一档：

```bash
node -v
command -v corepack || echo "corepack 不存在"
```

## 装齐本仓库需要的工具链

本仓库 `package.json` 声明 `engines.node` 为 `^22`、`packageManager` 为 `pnpm@9.0.0`。要点是 pnpm 版本必须是 9.0.0，否则可能写出与仓库 lockfile 不兼容的结果。

```bash
# 1. 装 Node 22
brew install node@22            # macOS
scoop install nodejs-lts        # Windows

# 2. 让 pnpm 版本对上 packageManager 字段
corepack enable                 # Node 24 及以前
npm install -g corepack && corepack enable   # Node 25 及以后

# 3. 确认
node -v      # 应为 v22.x
pnpm -v      # 应为 9.0.0

# 4. 装依赖
pnpm install --frozen-lockfile
```

如果 `pnpm -v` 不是 9.0.0，说明它来自别处（例如 Homebrew 装的全局 pnpm 排在 `PATH` 更前面）。用 `command -v pnpm` 看它到底是哪一个，处理办法见[命令查找顺序](/tutorial/terminal-shell-and-path#shell-怎么找到一个命令)。

## 延伸阅读

- [pnpm 官方文档](https://pnpm.io/)
- [Homebrew 文档](https://docs.brew.sh/)
- [语义化版本 2.0.0](https://semver.org/lang/zh-CN/)
- [npm package.json 字段说明](https://docs.npmjs.com/cli/v11/configuring-npm/package-json)
