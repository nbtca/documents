---
order: 2
maintainers:
  - user: m1ngsama
    since: 2026-09
---

# 配一台能跑本站的电脑

本文说明怎样把仓库克隆到本地，运行完整的站点，并完成一次从创建分支到合并的修改。

## 概览

如果只修改文档内容，不需要本地环境。[在网页上写](/tutorial/manual/writing-documents)更快。

只有修改导航结构、批量处理图片、修改站点代码或一次修改很多页时，才需要本地环境。第一次配置大约需要半小时。

每一步后面都有验证方法。验证不通过时，不要继续下一步。命令分为 macOS、Linux 和 Windows 三种写法。

## 第一步：确认终端能访问 GitHub

浏览器能打开 GitHub，不表示终端也能访问 GitHub。浏览器和终端使用不同的代理设置。

在终端中运行：

::: code-group

```bash [macOS / Linux]
curl -I https://github.com
```

```powershell [Windows]
curl.exe -I https://github.com
```

:::

- 如果返回 `HTTP/2 200` 等响应，验证通过。转到第二步。
- 如果命令没有响应或超时，终端要单独配置代理。原理和三个平台的设置方法见[计算机网络与代理](/tutorial/computer-networking-and-proxies#让终端走代理)。按需开关代理的函数见[终端、shell 与 PATH](/tutorial/terminal-shell-and-path#按需开关代理)。

在 Windows 上，必须写 `curl.exe`，原因见[计算机网络与代理](/tutorial/computer-networking-and-proxies#powershell-用户要多注意两点)。

## 第二步：安装 Git 和 GitHub CLI

必须安装 Git。GitHub CLI（`gh`）不是必需的，但它可以处理登录和创建 PR，减少手动操作。

从官网下载安装包是最简单的方法：[git-scm.com/downloads](https://git-scm.com/downloads) 和 [cli.github.com](https://cli.github.com/)。也可以用包管理器安装：

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

::: info 注
只有 Arch 的官方库包含 `gh`。在 Debian、Ubuntu 和 Fedora 上，要先添加 GitHub 的软件源。这段配置随上游变化，所以本页不复制它。按 [gh 的官方 Linux 安装说明](https://github.com/cli/cli/blob/trunk/docs/install_linux.md)操作。

你也可以不安装 `gh`。后面每个使用 `gh` 的地方，都有只用 Git 的方法。
:::

各种安装方法的比较见[包管理器与 Node 工具链](/tutorial/package-managers)。

**验证**：

```bash
git --version
gh --version      # 如果没有安装 gh，这条命令报“找不到命令”。这不影响后面的步骤
```

## 第三步：登录 GitHub

`git config` 只设置署名，不登录 GitHub。两件事都要做。

1. 设置 Git 的署名。提交记录用这个名字和邮箱：

   ```bash
   git config --global user.name "你的 GitHub 用户名"
   git config --global user.email "你的 GitHub 邮箱"
   ```

2. 登录 GitHub：
   - 如果安装了 `gh`，运行 `gh auth login`，依次选择 `GitHub.com` → `HTTPS` → `Login with a web browser`，再按提示在浏览器中完成登录。
   - 如果没有安装 `gh`，在 GitHub 网页上生成一个 personal access token。第一次运行 `git push` 时，把它当作密码输入。系统的凭据存储会记住它。

3. 运行 `gh auth status`，验证登录状态。

各平台的凭据存储和两种远程地址的认证区别，见 [HTTPS 还是 SSH](/tutorial/git-concepts#https-还是-ssh)。

## 第四步：安装 Node 和 pnpm

本仓库要求 **Node 22** 和 **pnpm 9.0.0**。使用其他版本会造成难以判断的错误。

1. 安装 Node 22。从[官方下载页](https://nodejs.org/en/download/prebuilt-installer)下载 22 版本的 LTS 安装包是最简单的方法。也可以用包管理器安装：

   ::: code-group

   ```bash [macOS]
   brew install node@22
   ```

   ```bash [Linux]
   apt policy nodejs        # Debian、Ubuntu
   dnf info nodejs          # Fedora、RHEL
   pacman -Si nodejs        # Arch
   # 发行版自带的版本常常太旧。先确认版本，再决定是否使用
   ```

   ```powershell [Windows]
   winget install OpenJS.NodeJS.LTS
   ```

   :::

2. 打开一个新的终端窗口。安装程序修改了系统的 `PATH`，已经打开的窗口读不到新的 `PATH`，原因见[环境变量为什么只对新开的程序生效](/tutorial/terminal-shell-and-path#环境变量为什么只对新开的程序生效)。
3. 启用 pnpm：

   ```bash
   corepack enable
   ```

   Node 22 自带 corepack。如果这条命令报“找不到命令”，你安装的 Node 不是 22 版本。

**验证**：

```bash
node -v      # v22.x
pnpm -v      # 9.0.0
```

如果 `pnpm -v` 不是 9.0.0，不要继续。按[装了新版本却没生效](/tutorial/terminal-shell-and-path#装了新版本却没生效)找出正在使用的是哪一个 pnpm。

## 第五步：克隆并运行

```bash
mkdir -p ~/Developer && cd ~/Developer
git clone https://github.com/nbtca/documents.git   # 安装了 gh 时，也可以用 gh repo clone nbtca/documents
cd documents
pnpm install --frozen-lockfile
```

克隆和安装依赖只做一次。

**验证**：

```bash
pnpm docs:dev
```

终端显示 `http://localhost:5173/` 等地址。在浏览器中打开这个地址，如果能看到文档站，验证通过。让这个命令保持运行，修改文件后页面立即刷新。按 `Ctrl + C` 停止。

## 一次修改的完整流程

### 创建分支

不要直接在 `main` 上修改。每次开始新任务前，先同步 `main`，再创建分支：

```bash
git switch main
git pull
git switch -c docs/你这次要做的事
```

分支名用英文。`docs/` 前缀表示文档修改。**验证**：在 `git branch` 的输出中，`*` 在你新建的分支前。

分支的概念见 [Git 的理念与模型](/tutorial/git-concepts#分支只是一个指针)。

### 修改并预览

1. 让 `pnpm docs:dev` 保持运行，在浏览器中查看修改的效果。
2. 用 `git status` 查看你修改了哪些文件。

写作要求见[写一页文档](/tutorial/manual/writing-documents#写作上的几条硬要求)。

### 提交

```bash
git add .
git commit -m "docs: 用英文一句话说清这次改了什么"
```

提交信息用英文，格式是 `类型: 描述`。文档修改用 `docs:`。`add` 和 `commit` 分为两步的原因见[工作区、索引、HEAD](/tutorial/git-concepts#工作区、索引、head)。

### 推送前检查

在本地运行 CI 的检查，以免 CI 失败：

```bash
pnpm run ci:lint
pnpm test -- --run
pnpm docs:build
pnpm run ci:verify
```

四条命令都必须没有报错。用构建产物判断结果，不要用 `docs:dev` 的页面判断，原因见 [VitePress](/tutorial/vitepress#验证要看构建产物)。

如果修改了标题，确认其他页面指向这个标题的锚点链接仍然有效，方法见[标题锚点](/tutorial/vitepress#标题锚点)。

### 推送并创建 PR

```bash
git push -u origin docs/你这次要做的事
gh pr create --web
```

第一次推送时加 `-u`。以后推送同一个分支，只运行 `git push`。

如果没有安装 `gh`，推送成功后，终端显示一个创建 PR 的链接。打开这个链接。你也可以打开仓库页面，GitHub 在页面顶部显示你刚推送的分支。

**验证**：在 GitHub 上能看到这个 PR，PR 下方的检查全部通过。

### 从评审到合并

维护者在 PR 中留下评论。如果需要修改，在同一个分支上修改并推送：

```bash
git add .
git commit -m "docs: address review comments"
git push
```

PR 自动更新。不要重新创建 PR。评审通过后，维护者合并 PR。

### 下一次

回到“创建分支”一步：

```bash
git switch main
git pull
git switch -c docs/下一件事
```

## 故障排查

| 现象                                | 参考                                                                             |
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

## 推送前检查单

- [ ] 当前分支不是 `main`。
- [ ] 内部链接以 `/` 开头，并且可以打开。
- [ ] 图片是 WebP 格式，并且在页面中正常显示。
- [ ] 新页面有 `maintainers`。
- [ ] 本地的四条检查都通过。
- [ ] 提交信息是英文。
