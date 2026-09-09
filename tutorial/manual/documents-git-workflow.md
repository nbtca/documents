---
order: 7
maintainers:
  - user: m1ngsama
    since: 2026-09
---

# 文档编写与 Git 协作

这份手册带你把一次文档修改从头做到底：改完、提交、经他人评审、合并进站点。照着敲就行，每一步都写清楚了敲什么、看到什么算成功。

想知道某一步**为什么**要这样做，跟着文中的链接去对应的教程；这份手册只讲怎么做。

## 先选一条路线

|              | 路线 A：在网页上改       | 路线 B：在自己电脑上改     |
| ------------ | ------------------------ | -------------------------- |
| 要装东西吗   | 不用                     | 要装 Node、pnpm、Git       |
| 适合         | 改错别字、补一段、加一页 | 大改、动图片、改代码或导航 |
| 能本地预览吗 | 有即时预览               | 能，完整站点               |
| 上手时间     | 几分钟                   | 第一次约半小时             |

**第一次参与，先走路线 A。** 它已经能完成大多数文档工作，而且走完一遍你就理解了整个协作流程，之后再配本地环境会轻松很多。

## 路线 A：在网页上改

### 第一步：打开要改的那一页

在 <https://docs.nbtca.space> 上找到你想修改的页面。

### 第二步：点击编辑入口

页面上有一个「**登录后在本页编辑**」的入口。想新建一页则点「**登录后新建一页**」。

点下去会跳到 GitHub 授权。用你自己的 GitHub 账号登录并同意授权即可，**不需要**这个仓库的写权限。

**看到什么算成功**：跳回文档站，入口文字变成「在本页编辑」，说明已登录。

### 第三步：改内容

点进去之后就是一个编辑框，左边写、右边实时看效果。

- 语法照 Markdown 写，常用的几种见 [Markdown](/tutorial/markdown)；
- 要插图就直接拖进去，会自动转成 WebP；
- 页面开头那段 `---` 之间的内容是元信息，不要动，除非你知道自己在改什么。

### 第四步：提交

点「提交」。系统会用你自己的账号复制一份仓库（fork），把改动放进去，然后**自动开一个 Pull Request**。

**看到什么算成功**：给出一个 PR 链接，点进去能看到你的改动。

### 第五步：等评审

维护者会在那个 PR 里回复。要改就继续在网页上改、再提交一次，**同一个 PR 会自动更新**，不用重开。通过之后由维护者合并，改动就上线了。

到这里路线 A 就走完了。

## 路线 B：在自己电脑上改

以下每一步做完都有验证方法，不通过就别往下走。

### 第一步：让终端能访问 GitHub

浏览器能打开 GitHub，不代表终端也能——两者走的不是同一条路。先验证：

```bash
curl -I https://github.com
```

能返回 `HTTP/2 200` 之类的响应就算通过，直接跳到第二步。

如果卡住或超时，说明终端需要单独配置代理。原理、环境变量写法和排查手段见[计算机网络与代理](/tutorial/computer-networking-and-proxies)，按需开关的函数写法见[终端、shell 与 PATH](/tutorial/terminal-shell-and-path#按需开关代理)。

### 第二步：装 Git 和 GitHub CLI

::: code-group

```bash [macOS]
brew install git gh
```

```powershell [Windows]
scoop install git gh
```

:::

没有 `brew` 或 `scoop` 就先装它们，做法与取舍见[包管理器与 Node 工具链](/tutorial/package-managers)。

**验证**：

```bash
git --version
gh --version
```

两条都能打印版本号即为成功。

### 第三步：登录 GitHub

先告诉 Git 你是谁——这决定提交记录上的署名：

```bash
git config --global user.name "你的 GitHub 用户名"
git config --global user.email "你的 GitHub 邮箱"
```

再登录：

```bash
gh auth login
```

依次选 `GitHub.com` → `HTTPS` → `Login with a web browser`，按提示在浏览器里完成。

**验证**：

```bash
gh auth status
```

显示已登录即为成功。注意 `git config` 只是署名，不等于登录，两件事都要做。

### 第四步：装 Node 和 pnpm

本站用 [VitePress](/tutorial/vitepress) 构建，需要 Node。本仓库要求 Node 22、pnpm 9.0.0。

::: code-group

```bash [macOS]
brew install node@22
```

```powershell [Windows]
scoop install nodejs-lts
```

:::

pnpm 的装法取决于你的 Node 版本，**不能一律用 `corepack enable`**：

```bash
node -v                                    # 先看版本
corepack enable                            # Node 24 及以前
npm install -g corepack && corepack enable # Node 25 及以后
```

原因见[包管理器与 Node 工具链](/tutorial/package-managers#corepack-现在不随-node-分发了)。

**验证**：

```bash
node -v      # v22.x
pnpm -v      # 9.0.0
```

`pnpm -v` 不是 9.0.0 的话别硬着头皮往下走，先按[命令查找顺序](/tutorial/terminal-shell-and-path#命令查找顺序)查清用的是哪一个 pnpm。

### 第五步：把仓库克隆到本地

```bash
mkdir -p ~/Developer && cd ~/Developer
gh repo clone nbtca/documents
cd documents
pnpm install --frozen-lockfile
```

克隆和装依赖都只需要做一次。

**验证**：

```bash
pnpm docs:dev
```

终端给出一个 `http://localhost:5173/` 之类的地址，浏览器打开能看到文档站，即为成功。这个命令保持运行，改文件会即时刷新。按 `Ctrl + C` 停止。

### 第六步：开一个分支

**不要直接在 `main` 上改。** 每次开始新任务前，先同步再开分支：

```bash
git switch main
git pull
git switch -c docs/你这次要做的事
```

分支名用英文，`docs/` 开头表示这是文档改动。

**验证**：`git branch` 的输出里，`*` 应该在你新建的分支上。

分支到底是什么，见 [Git 的理念与模型](/tutorial/git-concepts#引用只是指针)。

### 第七步：改，并且看着改

一边改 Markdown，一边让 `pnpm docs:dev` 开着，浏览器里就能实时看到效果。

随时可以看自己改了哪些文件：

```bash
git status
```

写作上的硬要求：

- 内部链接以 `/` 开头，例如 `/tutorial/markdown`；
- 图片一律 WebP，放在同级的 `assets/` 目录；
- 新页面的开头要写 `maintainers` 元信息，字段格式见 [VitePress](/tutorial/vitepress#frontmatter)；
- 加粗紧邻标点有个坑，见 [Markdown](/tutorial/markdown#强调的边界规则)。

### 第八步：提交

```bash
git add .
git commit -m "docs: 用英文一句话说清这次改了什么"
```

提交信息用英文，格式是 `类型: 描述`，文档改动用 `docs:`。

**验证**：`git log --oneline -1` 能看到你刚写的那条。

`add` 和 `commit` 分两步的原因，见 [Git 的理念与模型](/tutorial/git-concepts#三个区)。

### 第九步：推送前先自查

推之前在本地跑一遍，省得 CI 变红：

```bash
pnpm run ci:lint
pnpm test -- --run
pnpm docs:build
pnpm run ci:verify
```

四条都要没有报错。**判断依据是构建产物，不是 `docs:dev` 的页面**——原因见 [VitePress](/tutorial/vitepress#验证要看构建产物)。

### 第十步：推送并开 PR

```bash
git push -u origin docs/你这次要做的事
gh pr create --web
```

`gh pr create --web` 会打开浏览器让你填 PR 说明。第一次推送要带 `-u`，之后同一分支直接 `git push` 即可。

**验证**：GitHub 上能看到这个 PR，且下方 CI 检查全部变绿。

### 第十一步：评审到合并

维护者会在 PR 里留评论。需要改就继续在同一个分支上改：

```bash
git add .
git commit -m "docs: address review comments"
git push
```

**同一个 PR 会自动更新，不要重开。** 通过后合并，这次任务结束。

### 下一次任务

回到第六步即可：

```bash
git switch main
git pull
git switch -c docs/下一件事
```

## 卡住了看哪里

| 症状                                 | 去这篇                                                                             |
| ------------------------------------ | ---------------------------------------------------------------------------------- |
| 浏览器能开 GitHub，终端连不上        | [计算机网络与代理](/tutorial/computer-networking-and-proxies)                      |
| 换了代理之后 Git 突然连不上          | [Git 的代理配置层级](/tutorial/computer-networking-and-proxies#git-的代理配置层级) |
| 命令找不到，或版本号跟装的对不上     | [终端、shell 与 PATH](/tutorial/terminal-shell-and-path#命令查找顺序)              |
| 配置写了却不生效                     | [启动文件的读取顺序](/tutorial/terminal-shell-and-path#启动文件的读取顺序)         |
| `pnpm -v` 不是 9.0.0                 | [包管理器与 Node 工具链](/tutorial/package-managers)                               |
| 分支、合并、`fetch` 与 `pull` 分不清 | [Git 的理念与模型](/tutorial/git-concepts)                                         |
| 加粗、表格、链接写法                 | [Markdown](/tutorial/markdown)                                                     |
| 容器、代码组、组件、构建命令         | [VitePress](/tutorial/vitepress)                                                   |
| Issue、标签、评审在 GitHub 上怎么点  | [GitHub 工作流](/tutorial/github-workflow)                                         |

仍然解决不了就在群里问，或者直接开一个 [Issue](https://github.com/nbtca/documents/issues)。卡住不是你的问题，是这份手册没写清楚——欢迎顺手把它补上。

## 提交之前对照一遍

- 分支不是 `main`；
- 内部链接以 `/` 开头，且点得开；
- 图片是 WebP，且在页面里显示正常；
- 新页面写了 `maintainers`；
- 本地四条检查都通过；
- 提交信息是英文。
