---
order: 4
maintainers:
  - user: m1ngsama
    since: 2025-11
---

# 快速上手 NBTCA 的 GitHub 工作流

NBTCA 在 GitHub 上管理事务和代码。每件事用一个 Issue 跟踪。修改在自己的分支上完成，再通过 Pull Request 请求合并，由其他人评审。本文带你完整地走一遍这个流程。

## 为什么使用 GitHub 工作流

NBTCA 的工作常有下面几种情况：

- 多个成员参与同一件事；
- 同一时间有多件事在进行；
- 不同时间段的事情并行推进。

GitHub 工作流用 [Git](https://git-scm.com) 管理这些工作。很多事务也与协会的代码库直接相关。

## 基本概念

- **Issue**：一件事的跟踪单。谁在做、讨论的内容和完成状态都记录在 Issue 中。
- **分支（branch）**：你自己的工作区。分支上的修改不影响主分支。
- **Pull Request（PR）**：请求把你的修改合并到主分支。PR 也是评审和讨论的地方。
- **合并（merge）**：评审通过后，修改进入主分支，这件事完成。

```mermaid
flowchart TD
    %% 节点定义
    A[社员 Alice] -->|参与| T1[事务 1]
    B[社员 Bob] -->|参与| T1
    B -->|参与| T2[事务 2]
    C[社员 Carol] -->|参与| T3[事务 3]

    %% 事务时间段
    T1 -->|时间段: 2025.11.28 09:00-12:00| TS1[时间段 1]
    T2 -->|时间段: 2025.11.28 10:00-13:00| TS2[时间段 2]
    T3 -->|时间段: 2025.11.28 14:00-17:00| TS3[时间段 3]

    %% GitHub 工作流
    subgraph GitHub工作流
        G1[Fork 仓库] --> G2[Clone 本地]
        G2 --> G3[创建分支]
        G3 --> G4[提交代码/事务变更]
        G4 --> G5[Pull Request]
        G5 --> G6[代码审核/合并]
        G6 --> G7[更新主分支]
    end

    %% 事务关联工作流
    T1 --> G3
    T2 --> G3
    T3 --> G3
```

## 查看和参与事务

1. 打开 [Roadmap](/concepts/roadmap)。

   ![Roadmap 主界面](../assets/Roadmap.webp)

2. 打开一个你感兴趣的 Issue。

   ![MC 服务器管理对接 #63](../assets/Minecraft-Server-Management.webp)

3. 在 Assignees 中查看或添加负责人。

   ![Assignees](../assets/Assignees.webp)

4. 在 Labels 中设置标签，用于分类。

   ![Label-Setup](../assets/Label-Setup.webp)

5. 单击 Subscribe，订阅通知。通知发送到你的邮箱。

   ![Subscribe](../assets/Subs.webp)

Issue 的内容支持 Markdown 语法。

你也可以在终端中用 GitHub CLI 查看 Issue：

![gh-issue-list](../assets/gh-issue-list.webp)

![gh-issue-view](../assets/gh-issue-view.webp)

## 修改仓库中的文件

下面以修改 [Minecraft 仓库的 wiki](https://github.com/nbtca/Minecraft/wiki) 为例。

1. 打开 wiki 页面。

   ![Minecraft-Wiki](../assets/Minecraft-Wiki.webp)

2. 在 GitHub 上查看 wiki 的源文件。

   ![Minecraft-Wiki-gh](../assets/Minecraft-Wiki-gh.webp)

   你也可以用 git 命令克隆 wiki：

   ![Minecraft-Wiki-git](../assets/Minecraft-Wiki-git.webp)

3. 编辑文件。

   ![Edit](../assets/Edit.webp)

4. 提交修改。

   ![Commit](../assets/Commit.webp)

5. 确认页面显示提交成功。

   ![Success](../assets/Success.webp)

## 用 Pull Request 提交修改

大多数多人协作的仓库都保护主分支。主分支必须随时可用，所以不能直接向主分支提交。所有修改先提交到自己的分支，评审通过后再合并。

1. 在你自己的分支上编辑和提交。

   ![Branch](../assets/Branch.webp)

2. 向主分支创建一个 Pull Request。下图以提交本文为例。

   ![Create-PR](../assets/Create-PR.webp)

3. 填写 PR 的内容。在右上角的 Reviewers 中选择评审人。

   ![Reviewer-PR](../assets/Reviewer-PR.webp)

4. 如果要在评审通过后自动合并，启用 Auto-Merge。

   ![Auto-Merge](../assets/Auto-Merge.webp)

评审人看到的页面如下：

![PR-Reviewer](../assets/PR-Reviewer.webp)

评审人的操作：

1. 单击 Approve，批准修改。

   ![Approve](../assets/Approve.webp)

2. 单击 Merge，合并修改。

   ![Merge](../assets/Merge.webp)

合并后，这件事完成。如果你想参与编写手册，见[写一页文档](/tutorial/manual/writing-documents)。
