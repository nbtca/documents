---
order: 12
maintainers:
  - user: m1ngsama
    since: 2026-09
---

# Git 的理念与模型

弄清 Git 到底在存什么，以后命令的行为就不必靠背。

## 概览

Git 的全部行为建立在四件事上。

- 它存**快照**，不存差分。每次提交记录当时整棵目录树的样子。
- 每个对象的名字是它**内容的哈希**。内容一样必然同名，对象写进去就不能改。
- 你日常在**三个位置**之间搬东西：工作区、索引、HEAD。
- 分支、标签、HEAD 都只是**指向某次提交的指针**，创建和切换都很轻。

术语链接指向 [Git 官方术语表](https://git-scm.com/docs/gitglossary)，你可以随时点进去看原始定义。

## Git 存的是快照

很多版本控制系统记录“第 3 行改成了什么”。Git 不这样。它把内容拆成四种对象：

- [blob](https://git-scm.com/docs/gitglossary#def_blob_object)，一个文件的内容，不含文件名；
- [tree](https://git-scm.com/docs/gitglossary#def_tree_object)，一个目录，列出它包含的 blob 和子 tree，以及各自的名字与权限；
- [commit](https://git-scm.com/docs/gitglossary#def_commit_object)，指向一个 tree，加上作者、时间、说明，以及指向父提交的指针；
- [tag](https://git-scm.com/docs/gitglossary#def_tag_object)，给某个对象起的一个带说明的名字。

文件名存在 tree 里而不是 blob 里，所以内容相同的两个文件在库里只有一份 blob。

## 对象名就是内容的哈希

每个对象的名字是它内容的哈希值，术语表称之为 [object name](https://git-scm.com/docs/gitglossary#def_object_name)。由此得到两个性质：内容相同必然同名；对象一旦写入就不可修改，改内容等于产生一个新对象。

提交历史因此是一条哈希链。每个 commit 记着父提交的名字，你改动任何一次历史提交，其后所有提交的名字都会跟着变。这是 rebase 被称为“重写历史”的原因，也是已经推送的提交不该随便重写的原因。

哈希算法目前仍是 SHA-1。Git 在 2018 年底选定 SHA-256 作为继任算法，见[过渡设计文档](https://git-scm.com/docs/hash-function-transition)，[`git init`](https://git-scm.com/docs/git-init) 的 `--object-format` 可以指定。同一份文档同时写明：

> `sha1` is the default. Note: At present, there is no interoperability between SHA-256 repositories and SHA-1 repositories.

查看当前仓库用的是哪一种：

```bash
git rev-parse --show-object-format
```

## 工作区、索引、HEAD

| 位置                                                            | 是什么                                           |
| --------------------------------------------------------------- | ------------------------------------------------ |
| [工作区](https://git-scm.com/docs/gitglossary#def_working_tree) | 你正在编辑的那些文件                             |
| [索引](https://git-scm.com/docs/gitglossary#def_index)          | 下一次提交的草稿，`git add` 往这里放，也叫暂存区 |
| [HEAD](https://git-scm.com/docs/gitglossary#def_HEAD)           | 当前分支最新那次提交                             |

```bash
git status          # 三者之间的差异
git diff            # 工作区 与 索引 的差异
git diff --staged   # 索引 与 HEAD 的差异
```

索引的存在解释了一件常让新人困惑的事：你改了文件，`git commit` 却说没有内容可提交。改动还在工作区，你没有 `git add` 把它放进索引。

## 分支只是一个指针

[分支](https://git-scm.com/docs/gitglossary#def_branch)不是一份代码副本，而是一个指向某次提交的可变指针，存在 `.git/refs/` 下，文件内容就是一个对象名。创建分支几乎不花时间也不占空间。

- [HEAD](https://git-scm.com/docs/gitglossary#def_HEAD) 通常指向当前分支，分支再指向提交。
- HEAD 直接指向某次提交时，你处于 [detached HEAD](https://git-scm.com/docs/gitglossary#def_detached_HEAD) 状态，此时的提交不属于任何分支。
- [reflog](https://git-scm.com/docs/gitglossary#def_reflog) 记录这些指针近期的每一次移动。误操作之后靠它找回。

```bash
git switch -c new-branch   # 建分支并切过去
git branch -v              # 各分支指向哪次提交
git reflog                 # 指针移动记录
```

[`git switch`](https://git-scm.com/docs/git-switch) 与 [`git restore`](https://git-scm.com/docs/git-restore) 是把旧 `git checkout` 的两类职责拆开的结果，前者切分支，后者恢复文件。旧命令仍然可用。

## 合并与变基

两个分支合并时，Git 先找它们最近的共同祖先，即 [merge base](https://git-scm.com/docs/git-merge-base)，然后以它为基准做三方合并。

- 当前分支的提交都已包含在对方历史里时，Git 直接把指针前移，这叫 [fast-forward](https://git-scm.com/docs/gitglossary#def_fast_forward)，不产生新提交。
- 否则产生一次有两个父提交的[合并提交](https://git-scm.com/docs/gitglossary#def_merge)。
- [rebase](https://git-scm.com/docs/gitglossary#def_rebase) 走另一条路：把你的提交逐个重放到新基点上。父提交变了，重放出来的是一批**新对象**，旧的那些被丢弃。

merge 保留真实发生过的分叉，rebase 得到线性历史但改写了对象名。判断用哪个只看一件事：这些提交别人是否已经基于它们工作。是的话，不要 rebase。

## 冲突长什么样

两边改了同一处，Git 无法自动决定保留谁，就把两种版本一起写进文件并停下来。[git-merge 文档](https://git-scm.com/docs/git-merge#_how_conflicts_are_presented)描述了这种标记：

```text
<<<<<<< HEAD
你这边的内容
=======
对方的内容
>>>>>>> other-branch
```

解决它分三步。先打开文件，把这七个大于号小于号连同不要的那部分一起删掉，只留下你想要的最终内容。然后 `git add` 这个文件，告诉 Git 你处理完了。最后 `git commit` 完成合并。

```bash
git status          # 列出还有哪些文件处于冲突状态
git add 文件名
git commit
```

中途想放弃回到合并前：

```bash
git merge --abort
```

冲突不是错误，是 Git 在拒绝替你做决定。

## 和远程交换

每个克隆都是一个完整仓库，带全部历史。与他人交换靠[远程](https://git-scm.com/docs/gitglossary#def_remote)。

| 命令                                                          | 做什么                                  |
| ------------------------------------------------------------- | --------------------------------------- |
| `git clone`                                                   | 首次把整个仓库复制到本地                |
| [`git fetch`](https://git-scm.com/docs/gitglossary#def_fetch) | 把远程的新提交取回本地，不动你的工作区  |
| [`git pull`](https://git-scm.com/docs/gitglossary#def_pull)   | fetch 之后再 merge 或 rebase 进当前分支 |
| [`git push`](https://git-scm.com/docs/gitglossary#def_push)   | 把本地提交送到远程                      |

哪些本地引用对应哪些远程引用，由 [refspec](https://git-scm.com/docs/gitglossary#def_refspec) 描述。`git push -u origin branch` 里的 `-u` 就是把这层对应关系记下来，之后 `git push` 不必再写参数。

`fetch` 和 `pull` 的差别值得单独记：你想先看看别人改了什么再决定，用 `fetch`；`pull` 会直接动你的分支。

## HTTPS 还是 SSH

同一个仓库有两种远程地址，认证方式完全不同。

```bash
git remote -v       # 先看你用的是哪种
```

`https://github.com/...` 走 HTTPS，用令牌认证。每次输入令牌很麻烦，[凭据存储](https://git-scm.com/docs/gitcredentials)可以把它记住，各平台的默认实现不同：macOS 用钥匙串，Windows 用 Git Credential Manager，Linux 上常见 libsecret。用 `gh auth login` 登录时，GitHub CLI 会替你把这些配好。

`git@github.com:...` 走 SSH，用密钥对认证，配置方法见 [GitHub 的 SSH 文档](https://docs.github.com/en/authentication/connecting-to-github-with-ssh)。

两者有一处影响排查：**代理配置只对 HTTPS 远程生效**。你的远程是 SSH 形式时，`http.proxy` 那一套完全不起作用，见[给 Git 单独配代理](/tutorial/computer-networking-and-proxies#给-git-单独配代理)。

## 跨平台协作的两个坑

这两个坑都来自[操作系统之间的分歧](/tutorial/operating-systems)，而 Git 恰好站在中间。

### 换行符

Unix 一支用 `LF` 换行，Windows 传统上用 `CRLF`。同一个文件，Windows 成员改一行提交上来，diff 可能显示整个文件都变了。

[`core.autocrlf`](https://git-scm.com/docs/git-config#Documentation/git-config.txt-coreautocrlf) 控制 Git 在检出和提交时怎么转换：

> Setting this variable to "true" is the same as setting the text attribute to "auto" on all files and `core.eol` to "crlf". Set to true if you want to have CRLF line endings in your working directory and the repository has LF line endings. This variable can be set to `input`, in which case no output conversion is performed.

按平台的常规配置是 Windows 上 `true`、macOS 与 Linux 上 `input`。更稳妥的做法是在仓库里放一个 [`.gitattributes`](https://git-scm.com/docs/gitattributes)，把规则跟着仓库走，不依赖每个人的本机设置。

### 大小写

Windows 与 macOS 的默认文件系统不区分大小写，Linux 区分。你在 Mac 上把 `Readme.md` 改名为 `readme.md`，Git 可能认为什么都没变，而 Linux 上的 CI 会因为找不到文件而失败。

改名一律用 Git 自己的命令，不要在访达或资源管理器里直接改：

```bash
git mv Readme.md readme.md
```

相关配置是 [`core.ignoreCase`](https://git-scm.com/docs/git-config#Documentation/git-config.txt-coreignoreCase)，Git 在这类文件系统上通常自动设为 true。

## 不想提交的文件

构建产物、依赖目录、本地配置不应该进仓库。在 [`.gitignore`](https://git-scm.com/docs/gitignore) 里按行写匹配模式即可：

```text
node_modules/
.vitepress/dist/
.DS_Store
```

`.gitignore` 只对**尚未被跟踪**的文件有效。一个文件已经提交过，之后再加进 `.gitignore` 不会让它消失，你要先把它从索引里移出去：

```bash
git rm --cached 文件名
```

## 哪些概念其实属于 GitHub

Git 本身没有下面这些，它们是平台功能：

- **Pull Request**，请求把某个分支合并进另一个分支，同时充当评审与讨论的场所；
- **fork**，在平台上复制一份属于自己的仓库；
- **review 与 approve**，平台上的评审流程；
- **分支保护**，平台对某些分支施加的推送限制。

Git 只知道分支、提交和远程。NBTCA 怎么用这套平台流程，见 [GitHub 工作流](/tutorial/github-workflow)。

## 常用命令动了什么

| 命令         | 动了什么                                       |
| ------------ | ---------------------------------------------- |
| `git add`    | 工作区 → 索引                                  |
| `git commit` | 索引 → 新的 commit 对象，并把当前分支指针前移  |
| `git switch` | 移动 HEAD，并把工作区换成目标提交的内容        |
| `git merge`  | 造一个有两个父提交的 commit，或直接前移指针    |
| `git rebase` | 用新的父提交重放出一批新 commit                |
| `git reset`  | 移动分支指针，按参数决定是否一并改索引和工作区 |
| `git reflog` | 只读，列出指针移动记录                         |

## 延伸阅读

- [《Pro Git》第 10 章 Git Internals](https://git-scm.com/book/en/v2/Git-Internals-Git-Objects)，中文版见[同书中文翻译](https://git-scm.com/book/zh/v2)
- [Git 官方术语表](https://git-scm.com/docs/gitglossary)
- [Git 官方参考手册](https://git-scm.com/docs)
- [GitHub 的 SSH 连接文档](https://docs.github.com/en/authentication/connecting-to-github-with-ssh)
