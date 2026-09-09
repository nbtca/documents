---
order: 12
maintainers:
  - user: m1ngsama
    since: 2026-09
---

# Git 的理念与模型

本文讲 Git 的数据模型：它存什么、对象名从哪来、三个区各自的角色、引用为什么只是指针、合并与变基的差别、以及分布式协作的机制。理解这些之后，命令的行为就不再需要背。术语链接指向 [Git 官方术语表](https://git-scm.com/docs/gitglossary)，结论指向对应的官方文档。

哪些东西**不属于** Git，最后一节单独讲——这是新人最容易混淆的地方。

## Git 存快照，不存差分

很多版本控制系统记录“第 3 行改成了什么”。Git 不这样：每次提交都记录当时整棵目录树的完整状态，没变的文件复用上一次的对象。

内容被拆成四种对象：

- [blob](https://git-scm.com/docs/gitglossary#def_blob_object)：一个文件的内容，不含文件名；
- [tree](https://git-scm.com/docs/gitglossary#def_tree_object)：一个目录，列出它包含的 blob 和子 tree，以及各自的名字与权限；
- [commit](https://git-scm.com/docs/gitglossary#def_commit_object)：指向一个 tree，加上作者、时间、说明，以及指向父提交的指针；
- [tag](https://git-scm.com/docs/gitglossary#def_tag_object)：给某个对象起的一个带说明的名字。

文件名存在 tree 里而不是 blob 里，所以同样内容的两个文件在库里只有一份 blob。

## 对象名就是内容的哈希

每个对象的名字是它内容的哈希值，[Git 术语表](https://git-scm.com/docs/gitglossary#def_object_name)称之为 object name。这带来两个性质：内容相同必然同名；对象一旦写入就不可修改——改内容等于产生一个新对象。

提交历史因此是一条哈希链：每个 commit 记着父提交的名字，改动任何一次历史提交都会让其后所有提交的名字发生变化。这是 rebase 被称为“重写历史”的原因，也是为什么已经推送的提交不该随便重写。

哈希算法目前仍是 SHA-1。Git 在 2018 年底选定 SHA-256 作为继任算法（见[过渡设计文档](https://git-scm.com/docs/hash-function-transition)），`git init` 的 [`--object-format`](https://git-scm.com/docs/git-init) 可以指定，但该文档同时写明：

> `sha1` is the default. Note: At present, there is no interoperability between SHA-256 repositories and SHA-1 repositories.

查看当前仓库用的哪一种：

```bash
git rev-parse --show-object-format
```

## 三个区

日常操作实际上在三个位置之间搬东西：

| 位置                                                             | 是什么                               |
| ---------------------------------------------------------------- | ------------------------------------ |
| [工作区](https://git-scm.com/docs/gitglossary#def_working_tree)  | 你正在编辑的那些文件                 |
| [索引](https://git-scm.com/docs/gitglossary#def_index)（暂存区） | 下一次提交的草稿，`git add` 往这里放 |
| [HEAD](https://git-scm.com/docs/gitglossary#def_HEAD)            | 当前分支最新那次提交                 |

```bash
git status          # 三者之间的差异
git diff            # 工作区 与 索引 的差异
git diff --staged   # 索引 与 HEAD 的差异
```

索引的存在解释了一件常让新人困惑的事：改了文件但 `git commit` 说没有内容可提交——因为改动还在工作区，没有 `git add` 进索引。

## 引用只是指针

[分支](https://git-scm.com/docs/gitglossary#def_branch)不是一份代码副本，而是一个指向某次提交的可变指针，存在 `.git/refs/` 下，内容就是一个对象名。所以创建分支几乎不花时间也不占空间。

- [HEAD](https://git-scm.com/docs/gitglossary#def_HEAD) 通常指向当前分支，分支再指向提交；
- HEAD 直接指向某次提交时，处于 [detached HEAD](https://git-scm.com/docs/gitglossary#def_detached_HEAD) 状态，此时的提交不属于任何分支；
- [reflog](https://git-scm.com/docs/gitglossary#def_reflog) 记录这些指针近期的每一次移动，误操作之后靠它找回。

```bash
git switch -c new-branch   # 建分支并切过去
git branch -v              # 各分支指向哪次提交
git reflog                 # 指针移动记录，救命用
```

`git switch` 与 `git restore` 是把旧 `git checkout` 的两类职责拆开的结果：前者切分支，后者恢复文件。旧命令仍然可用。

## 合并与变基

两个分支合并时，Git 先找它们最近的共同祖先，即 [merge base](https://git-scm.com/docs/git-merge-base)，然后以它为基准做三方合并。

- 如果当前分支的提交都已包含在对方历史里，可以直接把指针前移，这叫 [fast-forward](https://git-scm.com/docs/gitglossary#def_fast_forward)，不产生新提交；
- 否则产生一次有两个父提交的[合并提交](https://git-scm.com/docs/gitglossary#def_merge)；
- [rebase](https://git-scm.com/docs/gitglossary#def_rebase) 换一条路：把你的提交逐个重放到新基点上。因为父提交变了，重放出来的是**一批新对象**，旧的那些被丢弃。

所以 merge 保留真实发生过的分叉，rebase 得到线性历史但改写了对象名。判断标准很简单：这些提交别人是否已经基于它们工作——是，就不要 rebase。

## 分布式

每个克隆都是一个完整仓库，带全部历史。与他人交换靠[远程](https://git-scm.com/docs/gitglossary#def_remote)：

| 命令                                                          | 做什么                                     |
| ------------------------------------------------------------- | ------------------------------------------ |
| `git clone`                                                   | 首次把整个仓库复制到本地                   |
| [`git fetch`](https://git-scm.com/docs/gitglossary#def_fetch) | 把远程的新提交取回本地，**不动**你的工作区 |
| [`git pull`](https://git-scm.com/docs/gitglossary#def_pull)   | fetch 之后再 merge（或 rebase）进当前分支  |
| [`git push`](https://git-scm.com/docs/gitglossary#def_push)   | 把本地提交送到远程                         |

哪些本地引用对应哪些远程引用，由 [refspec](https://git-scm.com/docs/gitglossary#def_refspec) 描述。`git push -u origin branch` 里的 `-u` 就是把这层对应关系记下来，之后 `git push` 不必再写参数。

`fetch` 与 `pull` 的差别值得单独记：想先看看别人改了什么再决定，用 `fetch`；`pull` 会直接动你的分支。

## 这些不是 Git 的东西

Git 本身没有以下概念，它们属于 GitHub（或 GitLab 等平台）：

- **Pull Request**：请求把某个分支合并进另一个分支的**平台功能**，同时充当评审与讨论的场所；
- **fork**：在平台上复制一份属于自己的仓库；
- **review / approve**：平台上的评审流程；
- **分支保护**：平台对某些分支施加的推送限制。

Git 只知道分支、提交和远程。NBTCA 怎么用这套平台流程，见 [GitHub 工作流](/tutorial/github-workflow)。

## 常用命令对应的操作对象

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

- [《Pro Git》第 10 章 Git Internals](https://git-scm.com/book/en/v2/Git-Internals-Git-Objects)——中文版见[同书中文翻译](https://git-scm.com/book/zh/v2)
- [Git 官方术语表](https://git-scm.com/docs/gitglossary)
- [Git 官方参考手册](https://git-scm.com/docs)
