---
order: 19
maintainers:
  - user: m1ngsama
    since: 2026-10
---

# 让 AI 审一页文档

给你的 AI agent 装上协会的审稿 skill，让它按本站的写法审一页文档：它先给你一份报告，你点了头的部分它才改。

## 概览

直接对 agent 说“帮我把这页改好一点”，它多半会不打招呼就改文件，还会凭记忆往里添内容。`nbtca-docs-review` 这个 skill 管的就是这两件事：它让 agent 先交报告，把拿不准的事实写成问题留给作者，自己不改。

它审的是写法：一页是不是只做一件事，标题和步骤清不清楚，有没有空话。事实对不对仍然由你核实，规矩见[用 AI 帮忙写文档](/tutorial/manual/ai-assisted-writing)。

skill 是一个放着说明文件的文件夹，agent 遇到对应的任务会自己去读，格式见 [Agent Skills 规范](https://agentskills.io/specification)。这个 skill 目前只在 Claude Code 里测过，在其他 agent 里未经实测。

## 第一步：装上 skill

把 skill 仓库拉下来，再把 `nbtca-docs-review` 文件夹复制到 agent 的 skills 目录。Claude Code 的个人 skills 目录是 `~/.claude/skills/`，出处见 [Claude Code 文档](https://code.claude.com/docs/en/skills#where-skills-live)。

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

Windows 的写法未经实测。用别的 agent 时，把目的地换成它自己的 skills 目录，位置查它的文档。`git clone` 连不上 GitHub 的话，见[国际互联网的使用](/tutorial/manual/net-usage)。

**看到什么算成功**：`~/.claude/skills/nbtca-docs-review/` 下有一个 `SKILL.md` 和一个 `references` 文件夹。

## 第二步：让它审

告诉 agent 要审哪一页，三种给法都行：

- 本站的网址，例如“帮我审一下 `https://docs.nbtca.space/tutorial/manual/google-calendar`”；
- 本地仓库里的文件路径；
- 直接把草稿贴给它，并说明打算放在哪个板块。

**看到什么算成功**：它回你一份报告，分“结论”“问题”“需要核实”“维护者”四节，最后问你按哪几条改。这时任何文件都还没有被改动。

“问题”一节最多七条，分两种。“行文”只动措辞，内容不变。“结构”是拆页、删节、改标题这类改动，会影响网址或锚点，通常要另开一个 Pull Request。

## 第三步：挑要改的

回它编号，例如“按 1、3、6 改”，它只改这几条。

- 本地有仓库时，它直接改文件，你用 `git diff` 看一遍再提交；
- 只用网页编辑器时，它给你改好的全文，你贴回编辑框，提交方法见[写一页文档](/tutorial/manual/writing-documents)。

**看到什么算成功**：改动里只有你点了编号的那几条，页面开头两行 `---` 之间的元信息没有变。

## “需要核实”一节怎么处理

那一节列的是它看出了疑问、但不该由它回答的地方：页面里前后矛盾的说法，它没法检查的链接和命令，或者一句话缺了关键条件。这些要你自己去查，或者去问这一页的维护者。查清楚之前，原句保持不动。

## 它不做什么

- **不改事实。** 版本号、命令、人名、日期，它只提问。
- **不动照录的归档页。** `archived/` 下照录原件的页面，正文它一个字都不改，疑似笔误只会请你对照原件。
- **不补内容。** 页面缺一节，它会指出来，不会替作者写。

## 也读一读

- [用 AI 帮忙写文档](/tutorial/manual/ai-assisted-writing)，哪些事可以交给 AI
- [写一页文档](/tutorial/manual/writing-documents)，提交流程
- [nbtca/skills](https://github.com/nbtca/skills/tree/main/skills/nbtca-docs-review)，这个 skill 的源文件
