---
order: 2
maintainers:
  - user: m1ngsama
    since: 2026-09
---

# 配一台能跑本站的电脑

把仓库拉到本地、跑起完整站点，并走完一次从分支到合并的修改。

## 概览

只改文档内容的话，你不需要这些，[在网页上写](/tutorial/manual/writing-documents)更快。

要改导航结构、批量处理图片、动站点代码，或者一次改很多页，才需要本地环境。第一次配大约半小时。

每一步做完都给了验证方法，不通过就别往下走。命令分 macOS、Linux、Windows 三种写法。

## 第一步：让终端能访问 GitHub

浏览器能打开 GitHub，不代表终端也能。两者读的不是同一份代理设置。

::: code-group

```bash [macOS / Linux]
curl -I https://github.com
```

```powershell [Windows]
curl.exe -I https://github.com
```

:::

返回 `HTTP/2 200` 之类的响应就算通过，跳到第二步。Windows 上要写 `curl.exe`，原因见[计算机网络与代理](/tutorial/computer-networking-and-proxies#powershell-用户要多注意两点)。

卡住或超时说明终端需要单独配代理。原理与三平台的设置写法见[计算机网络与代理](/tutorial/computer-networking-and-proxies#让终端走代理)，按需开关的函数见[终端、shell 与 PATH](/tutorial/terminal-shell-and-path#按需开关代理)。

## 第二步：装 Git 与 GitHub CLI

Git 是必需的。GitHub CLI（`gh`）不是必需，但它能替你处理登录和开 PR，省掉不少手工步骤，建议装上。

最省事的是从官网下安装包：[git-scm.com/downloads](https://git-scm.com/downloads) 和 [cli.github.com](https://cli.github.com/)，双击装完。用包管理器的话：

::: code-group

```bash [macOS]
brew install git gh
```

```bash [Linux]
sudo apt install git            # Debian、Ubuntu
sudo dnf install git            # Fedora、RHEL
sudo pacman -S git github-cli   # Arch，gh 在官方库里
```

```powershell [Windows]
winget install Git.Git
winget install GitHub.cli
```

:::

**Linux 上装 `gh` 要注意**：只有 Arch 的官方库带它。Debian、Ubuntu、Fedora 都需要先添加 GitHub 自己的软件源，步骤见 [gh 的官方 Linux 安装说明](https://github.com/cli/cli/blob/trunk/docs/install_linux.md)。嫌麻烦就跳过 `gh`，后面凡是用到它的地方都给了纯 Git 的替代写法。

各条路的取舍见[包管理器与 Node 工具链](/tutorial/package-managers)。

**验证**：

```bash
git --version
gh --version      # 没装 gh 的话这条会报找不到命令，不影响后面
```

## 第三步：登录 GitHub

先告诉 Git 你是谁，这决定提交记录上的署名：

```bash
git config --global user.name "你的 GitHub 用户名"
git config --global user.email "你的 GitHub 邮箱"
```

再登录。装了 `gh` 的话一条命令搞定：

```bash
gh auth login
```

依次选 `GitHub.com` → `HTTPS` → `Login with a web browser`，按提示在浏览器里完成。**验证**用 `gh auth status`。

没装 `gh` 也可以：在 GitHub 网页上生成一个 personal access token，第一次 `git push` 时把它当密码填进去，系统的凭据存储会记住它。

`git config` 只是署名，不等于登录，两件事都要做。凭据存储的各平台实现与两种远程地址的认证差别，见 [HTTPS 还是 SSH](/tutorial/git-concepts#https-还是-ssh)。

## 第四步：装 Node 与 pnpm

本仓库要求 **Node 22** 和 **pnpm 9.0.0**，版本不对会出各种奇怪问题。

从[官方下载页](https://nodejs.org/en/download/prebuilt-installer)取安装包最省事，选 22 那条 LTS 线。或者用包管理器：

::: code-group

```bash [macOS]
brew install node@22
```

```bash [Linux]
apt policy nodejs        # Debian、Ubuntu
dnf info nodejs          # Fedora、RHEL
pacman -Si nodejs        # Arch
# 发行版自带的版本常常太旧，先确认再决定用不用
```

```powershell [Windows]
winget install OpenJS.NodeJS.LTS
```

:::

装完**开一个新的终端窗口**，安装程序改的是系统 `PATH`，已开着的窗口读不到，原因见[环境变量为什么只对新开的程序生效](/tutorial/terminal-shell-and-path#环境变量为什么只对新开的程序生效)。然后启用 pnpm：

```bash
corepack enable
```

Node 22 自带 corepack，这条应当直接成功。报“找不到命令”说明你装的不是 22。

**验证**：

```bash
node -v      # v22.x
pnpm -v      # 9.0.0
```

`pnpm -v` 不是 9.0.0 就先停下，按[装了新版本却没生效](/tutorial/terminal-shell-and-path#装了新版本却没生效)查清用的是哪一个。

## 第五步：克隆并跑起来

```bash
mkdir -p ~/Developer && cd ~/Developer
git clone https://github.com/nbtca/documents.git   # 装了 gh 也可以用 gh repo clone nbtca/documents
cd documents
pnpm install --frozen-lockfile
```

克隆和装依赖只做一次。

**验证**：

```bash
pnpm docs:dev
```

终端给出 `http://localhost:5173/` 之类的地址，浏览器打开能看到文档站即为成功。这个命令保持运行，改文件会即时刷新，按 `Ctrl + C` 停止。

## 一次修改的完整流程

### 开一个分支

不要直接在 `main` 上改。每次开始新任务前先同步：

```bash
git switch main
git pull
git switch -c docs/你这次要做的事
```

分支名用英文，`docs/` 前缀表示文档改动。**验证**：`git branch` 的输出里 `*` 在你新建的分支上。

分支到底是什么，见 [Git 的理念与模型](/tutorial/git-concepts#分支只是一个指针)。

### 改，并且看着改

让 `pnpm docs:dev` 开着，浏览器里实时看效果。随时用 `git status` 看自己改了哪些文件。

写作上的硬要求见[写一页文档](/tutorial/manual/writing-documents#写作上的几条硬要求)。

### 提交

```bash
git add .
git commit -m "docs: 用英文一句话说清这次改了什么"
```

提交信息用英文，格式是 `类型: 描述`，文档改动用 `docs:`。`add` 和 `commit` 分两步的原因见[工作区、索引、HEAD](/tutorial/git-concepts#工作区、索引、head)。

### 推送前自查

在本地跑一遍，省得 CI 变红：

```bash
pnpm run ci:lint
pnpm test -- --run
pnpm docs:build
pnpm run ci:verify
```

四条都要没有报错。**判断依据是构建产物，不是 `docs:dev` 的页面**，原因见 [VitePress](/tutorial/vitepress#验证要看构建产物)。

改过标题的话，还要确认没有打断别处指向它的锚点链接，做法见[标题锚点](/tutorial/vitepress#标题锚点)。

### 推送并开 PR

```bash
git push -u origin docs/你这次要做的事
gh pr create --web
```

第一次推送要带 `-u`，之后同一分支直接 `git push`。没装 `gh` 的话，推送成功后终端会打印一个开 PR 的链接，点开即可；或者直接去仓库页面，GitHub 会在顶部提示你刚推的分支。**验证**：GitHub 上能看到这个 PR，下方检查全部变绿。

### 评审到合并

维护者会在 PR 里留评论。需要改就继续在同一个分支上改：

```bash
git add .
git commit -m "docs: address review comments"
git push
```

同一个 PR 会自动更新，不要重开。通过后合并，这次任务结束。

### 下一次

回到开分支那一步：

```bash
git switch main
git pull
git switch -c docs/下一件事
```

## 卡住了看哪里

| 症状                                | 去这篇                                                                           |
| ----------------------------------- | -------------------------------------------------------------------------------- |
| 浏览器能开 GitHub，终端连不上       | [计算机网络与代理](/tutorial/computer-networking-and-proxies)                    |
| 换了代理之后 Git 突然连不上         | [给 Git 单独配代理](/tutorial/computer-networking-and-proxies#给-git-单独配代理) |
| 命令找不到，或版本号跟装的对不上    | [终端、shell 与 PATH](/tutorial/terminal-shell-and-path#装了新版本却没生效)      |
| 配置写了却不生效                    | [配置写了却不生效](/tutorial/terminal-shell-and-path#配置写了却不生效)           |
| Windows 上脚本跑不起来              | [执行策略](/tutorial/terminal-shell-and-path#windows-上脚本跑不起来)             |
| `pnpm -v` 不是 9.0.0                | [包管理器与 Node 工具链](/tutorial/package-managers#pnpm-版本对不上时)           |
| 合并时出现一堆 `<<<<<<<`            | [冲突长什么样](/tutorial/git-concepts#冲突长什么样)                              |
| 明明只改了一行，diff 却显示整个文件 | [跨平台协作的两个坑](/tutorial/git-concepts#跨平台协作的两个坑)                  |
| 三种系统为什么处处不同              | [操作系统](/tutorial/operating-systems)                                          |

## 推送之前对照一遍

- 分支不是 `main`；
- 内部链接以 `/` 开头，且点得开；
- 图片是 WebP，且在页面里显示正常；
- 新页面写了 `maintainers`；
- 本地四条检查都通过；
- 提交信息是英文。
