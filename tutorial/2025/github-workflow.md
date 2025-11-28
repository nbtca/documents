# 快速上手社团目前的Github工作流

:::info 维护信息

|                 维护人                 |       时间       |
| :------------------------------------: | :--------------: |
| [@m1ngsama](mailto:contact@m1ng.space) | 2025.11.18 - now |

:::

## 目前NBTCA社内的常见工作场景

- 多个社员参与同一件事务
- 多个事务在同一个时间段
- 多个时间段事务并行执行

## 那为什么是Github工作流

- 主要还是为了用上[Git](https://git-scm.com)
- 刚好相关事务也关联我们的代码库

## 基本原理

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

    %% Github 工作流
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

## 一些示范

> 代码库的github流程我就按下不表了，我想感兴趣自己了解会很快

### 检查目前我们正在关注的事务

**_访问[Roadmap](https://github.com/orgs/nbtca/projects/5)_**

![Roadmap主界面](../assets/Roadmap.png)

**_找个感兴趣的Issue看看_**

![MC服务器管理对接#63](../assets/Minecraft-Server-Management.png)

**_群贤毕至嗷_**

![Assignees](../assets/Assignees.png)

**_设置个标签方便分类_**

![Label-Setup](../assets/Label-Setup.png)

**_订阅通知，会发到邮箱去_**

![Subscribe](../assets/Subs.png)

**_编辑内容支持markdown语法，所以几乎都能写_**

> 什么？不想在浏览器看？

**_那当然也是有的看滴😋_**

![gh-issue-list](../assets/gh-issue-list.png)

![gh-issue-view](../assets/gh-issue-view.png)

**_这个[wiki](https://github.com/nbtca/Minecraft/wiki)好像有点说法，看看怎么个事儿_**

![Minecraft-Wiki](../assets/Minecraft-Wiki.png)

**_看看源码😋_**

![Minecraft-Wiki-gh](../assets/Minecraft-Wiki-gh.png)
**_当然git命令同理_**

![Minecraft-Wiki-git](../assets/Minecraft-Wiki-git.png)

**_一派胡言！我来写点😋_**

![Edit](../assets/Edit.png)

**_经典丝滑连招_**

![Commit](../assets/Commit.png)

**_经验+3，告辞😋_**

![Success](../assets/Success.png)

---

🎉这样就完成了基本的常见NBTCA事务的Github工作流了

ps:你想更进一步？跟我一起来写手册吧😇

-
-
-
-
-
-
-
-
-
-
-
-
-
-
-
-
-
-
-
-
-
-
-
-
-

## 附加内容

> 恭喜你发现了附加内容XD

**_绝大多数多人协作的代码库都是有分支保护的_**

**_那么在真正的正常提交流程中你一般是在你自己的分支编辑的_**

![Branch](../assets/Branch.png)

**_所以你在自己的分支提交到Github后还需要向主分支发起合并请求（Pull Request）_**

**_本次以这个教程文档的提交为例_**

![Create-PR](../assets/Create-PR.png)

**_编辑此次PR的内容，并选择你希望审查你本次提交的人员（右上角Reviewers）_**

![Reviewer-PR](../assets/Reviewer-PR.png)

**_你还可以启用Auto-Merge，即在审查通过后自动合并本次源代码提交_**

![Auto-Merge](../assets/Auto-Merge.png)

**_如何Review就请这篇教程的Reviewer来写吧😋_**
