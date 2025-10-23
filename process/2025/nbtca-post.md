# 撰写并发布你的第一篇NBTCA博客

:::info 维护信息

|                 维护人                 |       时间       |
| :------------------------------------: | :--------------: |
| [@m1ngsama](mailto:contact@m1ng.space) | 2025.10.23 - Now |

:::

## 流程

flowchart TD
A[开始: 准备撰写博客] --> B{准备工作}
B --> C[安装 Git]
B --> D[注册 GitHub 账号]
B --> E[Git 基础配置]

    C & D & E --> F[Fork & Clone 项目]
    F --> G[创建新分支]
    G --> H[撰写 Markdown 博客]
    H --> I[提交更改到本地]
    I --> J[推送到远程仓库]
    J --> K[创建 Pull Request]
    K --> L{管理员审核}

    L -->|通过| M[代码合并]
    L -->|需要修改| N[根据反馈修改]
    N --> I

    M --> O[博客发布成功]
    O --> P[🎉 完成]

## 一、前言

本指南将指导你如何使用最主流的开源协作方式——**Git + Markdown + Pull Request**，来撰写并发布你的第一篇NBTCA博客。

目标是：

> 让每位新社员都能独立完成一篇博客投稿流程。

---

## 二、准备工作

### 1. 安装 Git

#### Windows

前往 [https://git-scm.com/downloads](https://git-scm.com/downloads) 下载并安装，保持默认选项即可。

#### macOS

安装命令行工具集，使用brew安装git

```bash
xcode-select --install
brew install git
```

#### Linux（例如 Ubuntu / Arch）

使用对应发行版的包管理器安装git

```bash
sudo apt install git
# 或
sudo pacman -S git
```

---

### 2. 注册 GitHub 账号

访问 [https://github.com](https://github.com)，注册并登录，设置一个好记的用户名。

---

### 3. 基础配置

```bash
git config --global user.name "你的名字"
git config --global user.email "你的邮箱"
```

> 当然，你也可以使用[github-cli](https://github.com/cli/cli)来完成github的认证过程，但是[git的工作流程](https://nbtca.space/posts/blogs/Tech/Git/git-book-1)还是必要掌握的

---

## 三、Fork 与 Clone 以及目前协会博客仓库的贡献方法

一般的工作流程是将源代码仓库[Fork](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/working-with-forks/fork-a-repo)一份到自己名下创建一个新的下游仓库，在自己的下游仓库编写代码并通过[创建pr](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/about-pull-requests)的方式提交更新到上游仓库。

目前NBTCA的[Home项目](https://github.com/nbtca/home)集成了[CI/CD](https://github.com/resources/articles/ci-cd)

为了保证交付安全，默认只有项目源代码仓库的分支提交的pr会触发[github action](https://github.com/features/actions)，从下游仓库提交的pr在合并后并不会触发构建，这一点需要注意，所以推荐在源代码的基础上创建分支并pr

### 2. Clone

```bash
git clone https://github.com/nbtca/home.git
cd blog
# 如果是gh-cli则是gh repo clone nbtca/home
```

---

## 四、创建分支

```bash
git checkout -b add-my-first-blog
# -b 参数代表创建一个新的分支
# 此处add-my-first-blog作为分支名可以自行替换，
# 我个人的习惯是提交类型+具体事务类型，例如post/blog-post、feature/homepage等。
```

---

## 五、撰写博客（Markdown 格式）

### 1. 新建文件

在 `src/pages/posts/` 文件夹中新建：

```
my-first-blog.md
# 换成你喜欢的名字，最好是英文的方便管理
```

### 2. 文件模板

```markdown
---
layout: "../../layouts/MarkdownPost.astro"
title: "题目"
pubDate: 2025-10-10
description: "描述"
author: "张三
cover:
  url: "封面地址url，也可以引用本地图片"
  alt: "cover"
tags: ["标签", "可多个"]
---

# Git 与 Markdown 入门指南

大家好，我是计算机协会新社员张三。

本文将介绍如何使用 Git 与 Markdown 撰写并提交博客。

## 一、Git 是什么？

Git 是一个分布式版本控制系统，用于多人协作开发。

## 二、Markdown 是什么？

Markdown 是一种轻量级标记语言，用简单的符号来排版文字。

- **加粗**：`**加粗**`
- _斜体_：`*斜体*`
- 链接：`[协会官网](https://example.com)`

## 三、总结

学会使用 Git + Markdown，你就能参与到开源协作中了！
```

> 以上为行文推荐格式，关于[markdown](https://www.markdownguide.org/)的写法可自行查阅手册。

---

## 六、提交与推送

```bash
git add my-first-blog.md
# 将更新的文件添加到暂存区

git commit -m "Add my first blog: Git 与 Markdown 入门"
# 将暂存区的文件集合为一次提交，并对本次提交做出说明

git push origin add-my-first-blog
# 将提交从本地同步到远程Github仓库，提交到远程仓库的对应新分支
```

---

## 七、创建 Pull Request（PR）

1. 打开你的 GitHub 仓库。
2. 点击 “**Compare & pull request**”。
3. 填写标题与说明（例如 “新增一篇关于 Git 的博客”）。
4. 目标仓库选择 `nbtca/home`。
5. 提交 Pull Request。

---

## 八、常见问题

| 问题                | 解决方案                                               |
| ------------------- | ------------------------------------------------------ |
| push 时提示拒绝访问 | 检查是否使用 HTTPS 地址，并确认你已登录 GitHub。       |
| 提交重复文件或出错  | 使用 `git status` 查看状态，`git reset` 撤销错误提交。 |
| PR 没被合并         | 可能格式不规范，等待管理员审核反馈。                   |

---

## 九、推荐工具

- 编辑器：**VS Code**、**Neovim**、**Typora**
- Markdown 预览插件：_Markdown Preview Enhanced_
- Git 图形界面工具：_GitHub Desktop_、_Sourcetree_

---

## 十、结语

当仓库管理员[Review](https://github.com/features/code-review)代码后，代码就可以[Merge](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/incorporating-changes-from-a-pull-request/merging-a-pull-request)了

当你第一次成功合并 PR 时：

> 恭喜你，🎉 你正式成为了开源协作的一员！
