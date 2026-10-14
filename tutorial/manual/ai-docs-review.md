---
order: 19
maintainers:
  - user: m1ngsama
    since: 2026-10
---

# 让 AI 审一页文档

本文说明怎样给 AI agent 安装协会的审稿 skill，让它按本站的写法审查一页文档。agent 先给出报告，只修改你同意的部分。

## 概览

如果只对 agent 说“帮我把这页改好一点”，它通常会直接修改文件，还会凭记忆添加内容。`nbtca-docs-review` 解决这两个问题：agent 先提交报告；不能确定的事实，agent 写成问题交给作者，自己不修改。

这个 skill 只审查写法：一页是否只做一件事，标题和步骤是否清楚，有没有空话。事实是否正确，仍然由你核实，规则见[用 AI 帮忙写文档](/tutorial/manual/ai-assisted-writing)。

skill 是一个包含说明文件的文件夹。agent 遇到对应的任务时，自动读取这些文件。格式见 [Agent Skills 规范](https://agentskills.io/specification)。这个 skill 只在 Claude Code 中测试过，没有在其他 agent 中测试。

## 第一步：安装 skill

克隆 skill 仓库，再把 `nbtca-docs-review` 文件夹复制到 agent 的 skills 目录。Claude Code 的个人 skills 目录是 `~/.claude/skills/`，出处见 [Claude Code 文档](https://code.claude.com/docs/en/skills#where-skills-live)。

::: code-group

```bash [macOS / Linux]
git clone https://github.com/nbtca/skills.git
mkdir -p ~/.claude/skills
cp -r skills/skills/nbtca-docs-review ~/.claude/skills/
```

```powershell [Windows]
git clone https://github.com/nbtca/skills.git
New-Item -ItemType Directory -Force "$HOME\.claude\skills"
Copy-Item -Recurse skills\skills\nbtca-docs-review "$HOME\.claude\skills\"
```

:::

Windows 的命令没有经过测试。使用其他 agent 时，把目标目录换成那个 agent 的 skills 目录，位置查它的文档。如果 `git clone` 不能连接 GitHub，见[上网、搜索与网络排障](/tutorial/manual/net-usage)。

**验证**：`~/.claude/skills/nbtca-docs-review/` 下有一个 `SKILL.md` 和一个 `references` 文件夹。

## 第二步：让 agent 审查

告诉 agent 要审查哪一页。用下面三种方法中的一种：

- 本站的网址，例如“帮我审一下 `https://docs.nbtca.space/tutorial/manual/google-calendar`”；
- 本地仓库里的文件路径；
- 直接把草稿发给它，并说明这一页属于哪个板块。

**验证**：agent 回复一份报告。报告分为“结论”“问题”“需要核实”“维护者”四节，最后问你按哪几条修改。这时没有任何文件被修改。

“问题”一节最多七条，分两种。“行文”只修改措辞，不改变内容。“结构”包括拆分页面、删除章节和修改标题。结构修改会影响网址或锚点，通常要另外创建一个 Pull Request。

## 第三步：选择要修改的条目

回复条目编号，例如“按 1、3、6 改”。agent 只修改这几条。

- 如果本地有仓库，agent 直接修改文件。用 `git diff` 检查修改，再提交。
- 如果只用网页编辑器，agent 给出修改后的全文。把全文粘贴到编辑框中，提交方法见[写一页文档](/tutorial/manual/writing-documents)。

**验证**：修改中只有你选择的条目。页面开头两行 `---` 之间的元信息没有变化。

## “需要核实”一节怎么处理

这一节列出 agent 发现、但不应由它回答的问题：页面中互相矛盾的说法，它不能检查的链接和命令，以及缺少关键条件的句子。你要自己查清这些问题，或者问这一页的维护者。查清之前，不要修改原句。

## agent 不做的事

- **不修改事实。** 对版本号、命令、人名和日期，它只提出问题。
- **不修改照录的归档页。** 对 `archived/` 中照录原件的页面，它不修改正文。发现疑似笔误时，它请你对照原件。
- **不补充内容。** 页面缺少一节时，它指出缺少什么，不替作者写。

## 相关页面

- [用 AI 帮忙写文档](/tutorial/manual/ai-assisted-writing)：哪些事可以交给 AI。
- [写一页文档](/tutorial/manual/writing-documents)：提交流程。
- [nbtca/skills](https://github.com/nbtca/skills/tree/main/skills/nbtca-docs-review)：这个 skill 的源文件。
