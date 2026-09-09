---
order: 11
maintainers:
  - user: m1ngsama
    since: 2026-09
---

# 包管理器与 Node 工具链

弄清装一个开发工具有哪几条路，以及本仓库要求的版本怎么装对。

## 概览

装软件这件事有三条路，难度和适用场合都不同。

- **官方安装包**：从官网下一个安装程序，双击装完。不需要你懂任何东西，也不需要打开终端。
- **包管理器**：在终端敲一条命令，由它去下载、安装、记录依赖。装得多了以后更省事，代价是你得先把包管理器本身装好。
- **版本管理器**：专门用来在同一台机器上并存多个版本并随时切换。只有当你同时参与要求不同版本的项目时才需要。

你只想给本仓库贡献文档的话，走第一条就够。

各平台的命令为什么不同，见[操作系统](/tutorial/operating-systems)。

## 本仓库要求什么版本

`package.json` 里写着两条硬要求：

```json
{
  "engines": { "node": "^22", "pnpm": "9.0.0" },
  "packageManager": "pnpm@9.0.0"
}
```

`^22` 的意思是 22.x 的任何版本，不能是 23 或更高。Node 22 目前仍是[长期支持版本](https://nodejs.org/en/about/previous-releases)。装了别的大版本，`pnpm install` 会打印一行 `Unsupported engine` 警告。

pnpm 必须是 9.0.0。版本对不上可能写出与仓库 lockfile 不兼容的结果。

## 第一条路：官方安装包

最省事，也最不容易出错。

**Node.js** 从[官方下载页](https://nodejs.org/en/download/prebuilt-installer)取，选 22 那一条 LTS 线。macOS 下 `.pkg`，Windows 下 `.msi`，双击按提示装完。Linux 上官方提供预编译压缩包，多数人更习惯用下面的包管理器。

**Git** 从 [git-scm.com/downloads](https://git-scm.com/downloads) 取，同样是双击安装。macOS 上另有一条捷径：在终端敲 `git`，系统会提示你安装命令行工具，装完就有 Git。

装完之后开一个**新的**终端窗口再验证。安装程序改的是系统的 `PATH`，已经开着的窗口读不到新值，原因见[终端、shell 与 PATH](/tutorial/terminal-shell-and-path#环境变量为什么只对新开的程序生效)。

```bash
node -v      # 期望 v22.x
git --version
```

## 第二条路：系统包管理器

### macOS 上的 Homebrew

Homebrew 有前置条件，装它之前先看清楚。[官方的 macOS 要求](https://docs.brew.sh/Installation#macos-requirements)包括这一条：

> Command Line Tools (CLT) for Xcode (from `xcode-select --install` or <https://developer.apple.com/download/all/>) or Xcode

这套工具有好几个 GB，网络慢的时候要等很久。你只是想装个 Node 的话，上一节的官方安装包更快。

```bash
xcode-select --install
```

装好 Homebrew 之后要把它的目录加进 `PATH`。安装脚本会打印具体命令，形如 `eval "$(/opt/homebrew/bin/brew shellenv)"`，这一行通常写进 `.zprofile`，为什么是这个文件见[配置写了却不生效](/tutorial/terminal-shell-and-path#配置写了却不生效)。

Homebrew 把东西装在一个前缀目录下。[安装文档](https://docs.brew.sh/Installation)说明：

> The script installs Homebrew to its default prefix (`/opt/homebrew` for Apple Silicon, `/usr/local` for macOS Intel and `/home/linuxbrew/.linuxbrew` for Linux) so that you don't need `sudo` after Homebrew's initial installation when you `brew install`.

从 Intel 机器迁移过来的 Mac 上两个前缀可能都在，`command -v brew` 能告诉你实际用的是哪一个。

```bash
brew install node@22 git
```

### Windows 上的 winget 与 Scoop

Windows 10 及以后自带 [winget](https://learn.microsoft.com/en-us/windows/package-manager/winget/)，不需要额外安装：

```powershell
winget install OpenJS.NodeJS.LTS
winget install Git.Git
```

[Scoop](https://github.com/ScoopInstaller/Scoop) 是另一个选择，取向不同。按[它自己的说明](https://github.com/ScoopInstaller/Scoop#what-does-scoop-do)，它免去 UAC 弹窗、跳过向导式安装界面、避免污染 `PATH`，把每个应用装在自己的目录里再用 shim 统一暴露命令。装 Scoop 前要放开脚本执行策略，做法见[Windows 上脚本跑不起来](/tutorial/terminal-shell-and-path#windows-上脚本跑不起来)。

### Linux 上发行版自带的那个

```bash
sudo apt install git      # Debian、Ubuntu
sudo dnf install git      # Fedora、RHEL
sudo pacman -S git        # Arch
```

Node 要当心：发行版仓库里的版本常常落后好几个大版本，装完可能根本不满足 `^22`。先查一下：

```bash
apt policy nodejs         # 或 dnf info nodejs / pacman -Si nodejs
```

版本不合适的话，用[官方预编译包](https://nodejs.org/en/download/prebuilt-installer)或下一节的版本管理器。

## 第三条路：版本管理器

你同时参与多个项目、而它们要求的 Node 版本不同时，才需要这个。它让你按项目切换版本，不必反复卸载重装。

| 工具                                                         | 平台                 |
| ------------------------------------------------------------ | -------------------- |
| [nvm](https://github.com/nvm-sh/nvm#installing-and-updating) | macOS、Linux         |
| [nvm-windows](https://github.com/coreybutler/nvm-windows)    | Windows              |
| [fnm](https://github.com/Schniz/fnm#installation)            | 三平台通用，启动更快 |

以 nvm 为例：

```bash
nvm install 22
nvm use 22
```

Node 官方下载页对这类工具附了一句提醒：它们的安装脚本不由 Node.js 项目维护，出问题要找各自的作者。

## 装 pnpm

pnpm 由 Corepack 按 `packageManager` 字段自动取用对应版本。Corepack 随 Node 分发，但有版本区间。[官方 README](https://github.com/nodejs/corepack) 写明：

> Corepack is distributed with Node.js from version 14.19.0 up to (but not including) 25.0.0.

一个旁证：`https://nodejs.org/api/corepack.html` 现在返回 308，跳转到那个 GitHub 仓库，Node 官网已不再托管这份文档。

本仓库要求的 Node 22 落在这个区间内。你按前面装好 Node 22 之后，Corepack 就是现成的：

```bash
corepack enable
```

装了 Node 25 或更高版本的人会发现 `corepack` 不存在，那种情况下先补装：

```bash
npm install -g corepack
corepack enable
```

验证：

```bash
node -v      # v22.x
pnpm -v      # 9.0.0
```

## pnpm 版本对不上时

`pnpm -v` 显示的不是 9.0.0，说明你的 `PATH` 里有另一个 pnpm 排在前面，常见于早先用 Homebrew 或 npm 全局装过。

::: code-group

```bash [macOS / Linux]
command -v pnpm     # 实际会执行的那一个
type -a pnpm        # 列出所有命中
```

```powershell [Windows]
Get-Command pnpm -All
```

:::

处理办法见[装了新版本却没生效](/tutorial/terminal-shell-and-path#装了新版本却没生效)。

## 版本锁定的四个字段

| 位置                                                                             | 作用                                                                   |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `dependencies` 里的版本范围                                                      | 声明能接受哪些版本，语法是[语义化版本](https://semver.org/lang/zh-CN/) |
| `pnpm-lock.yaml`                                                                 | 记录这次实际装了哪些确切版本，保证换台机器结果一致                     |
| [`engines`](https://docs.npmjs.com/cli/v11/configuring-npm/package-json#engines) | 声明项目要求的 Node 与包管理器版本                                     |
| `packageManager`                                                                 | 指定包管理器及其版本，由 Corepack 读取                                 |

`packageManager` 的格式见 [Corepack 文档](https://github.com/nodejs/corepack#when-authoring-packages)：值形如 `pnpm@9.0.0`，`名称@x.y.z` 是必需的，后面可以附一段哈希用于校验。

装依赖时用这条：

```bash
pnpm install --frozen-lockfile
```

它要求 lockfile 与 `package.json` 一致，不一致就报错而不是悄悄改写。CI 和多人协作都用它，不要用裸的 `pnpm install`。

## pnpm 与 npm、Yarn 的差别

npm 随 Node 一起分发。Yarn 在 [2016 年 10 月 11 日发布](https://classic.yarnpkg.com/blog/2016/10/11/introducing-yarn/)，主打确定性安装与 lockfile。pnpm 的差别在磁盘布局，[它的设计说明](https://pnpm.io/motivation)写道：

> When packages are installed, their files are hard-linked from that single place, consuming no additional disk space. This allows you to share dependencies of the same version across projects.

所有版本在全局只存一份，项目里的 `node_modules` 用硬链接指过去。同一份文档还指出，npm 与 Yarn Classic 会把所有包提升到 `node_modules` 根部，让代码能引用到并未声明为依赖的包，pnpm 默认不这么做。

## 延伸阅读

- [pnpm 官方文档](https://pnpm.io/)
- [Homebrew 文档](https://docs.brew.sh/)
- [Node.js 发布计划与 LTS 状态](https://nodejs.org/en/about/previous-releases)
- [语义化版本 2.0.0](https://semver.org/lang/zh-CN/)
- [npm package.json 字段说明](https://docs.npmjs.com/cli/v11/configuring-npm/package-json)
