---
maintainers:
  - user: m1ngsama
    since: 2026-09
---

# Prompt

Prompt 是 NBTCA 的命令行客户端，以 npm 包 [@nbtca/prompt](https://www.npmjs.com/package/@nbtca/prompt) 发布，装好后在终端输入 `nbtca` 即可使用。它把协会活动、本站文档、服务状态和个人课表搬进终端，既可以交互浏览，也可以作为脚本命令调用。

## 安装与使用

需要 Node.js 20.12 或更新版本。

```bash
npm install --global @nbtca/prompt
nbtca
```

不想安装，也可以用 `npx @nbtca/prompt --help` 直接运行。常用命令：

- `nbtca events`：近期协会活动，数据来自[协会日历](./calendar-feeds)，加 `--json` 输出机器可读格式；
- `nbtca docs`：在终端里浏览本站文档；
- `nbtca status`：从本机检查协会各项服务是否可达，包括只能在校内访问的内网服务；
- `nbtca schedule`：登录学校教务系统，把个人课表导出为 ICS 日历文件。

Prompt 不保存密码，只保存登录会话，在 macOS 和 Linux 上以仅限本人读写的权限存放。导出的课表和会话文件都属于个人隐私，不要随手分享。加 `--plain` 可以关掉颜色，得到稳定的纯文本输出。

## 技术栈

TypeScript，界面文案有中英两套。文档浏览用 [@nbtca/docs](https://www.npmjs.com/package/@nbtca/docs) 从本站的 GitHub 仓库读取 Markdown，日历与课表处理用 [nbtcal](/concepts/calendar-feeds#nbtcal-库)，Markdown 渲染用 [marked](https://marked.js.org/)。

## 参与开发

```bash
git clone https://github.com/nbtca/Prompt.git
cd Prompt
npm ci
npm run check
```

`npm run check` 依次跑格式检查、ESLint、TypeScript 类型检查、测试、打包检查和依赖安全审计，全部通过才能发布。开发指南和版本说明在仓库的 [Wiki](https://github.com/nbtca/Prompt/wiki)。

维护者是 [m1ngsama](https://github.com/m1ngsama)。仓库地址：[github.com/nbtca/Prompt](https://github.com/nbtca/Prompt)。

## 相关

其他项目见[基础设施与项目](/about/infrastructure)。
