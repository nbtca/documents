---
maintainers:
  - user: m1ngsama
    since: 2026-09
---

# Prompt

Prompt 是 NBTCA 的终端客户端，以 npm 包 [@nbtca/prompt](https://www.npmjs.com/package/@nbtca/prompt) 发布，装好后在终端输入 `nbtca` 即可使用。它把协会活动、本站文档、服务状态和个人课表搬进终端，既可以像应用一样用键盘交互浏览，也可以作为脚本命令调用。

<FactStrip :facts="[
  { label: '技术', value: 'TypeScript · Node.js' },
  { label: '安装', value: 'npm i -g @nbtca/prompt' },
  { label: '始于', value: '2025 年' },
  { label: '维护', value: 'm1ngsama' },
]" />

## 安装与使用

需要 Node.js 20.12 或更新版本：

```bash
npm install --global @nbtca/prompt
nbtca
```

不想安装，也可以用 `npx @nbtca/prompt --help` 直接运行。直接输入 `nbtca` 进入交互界面，分为主页、课表、活动、文档、设置五个标签页：数字键切换标签，方向键或 `j`/`k` 上下移动，回车打开，Esc 返回，`?` 查看全部快捷键，`q` 退出。

也可以只跑单条命令，适合写进脚本：

| 命令                                | 作用                                                                                                         |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `nbtca events`                      | 近期协会活动，可加 `--today`、`--week`、`--month`、`--search=关键词`、`--heatmap`，`--json` 输出机器可读格式 |
| `nbtca docs`                        | 在终端里浏览、搜索本站文档                                                                                   |
| `nbtca status`                      | 从本机检查协会服务是否可达，`--watch` 持续刷新                                                               |
| `nbtca schedule`                    | 登录学校教务系统，查看学期、导出个人课表为 ICS 文件                                                          |
| `nbtca website`、`github`、`repair` | 输出对应网址，加 `--open` 直接在浏览器打开                                                                   |
| `nbtca lang zh` / `lang en`         | 切换界面语言，默认中文                                                                                       |

`nbtca status` 从你自己的电脑发起检查，所以能测出只有在校园网里才打不开的内网服务，这是 [heartbeat](./heartbeat) 状态页做不到的：

```text
$ nbtca status --plain
  NBTCA 服务
  ------------------------------
  主页      + 在线      147ms
  文档      + 在线      1067ms
  iCal 源   + 在线      1862ms
  维修服务  + 在线      125ms

  外部平台
  ------------------------------
  GitHub    + 在线      1603ms
  路线图    + 在线      2387ms

  内网服务（仅校园网）
  ------------------------------
  云存储    o 离线      —
  镜像站    o 离线      —
公共服务运行正常；内网可用性取决于当前网络
```

上面是在校外运行的结果，内网服务显示离线是正常的。`--plain` 关掉颜色，输出稳定的纯文本。

## 课表登录的安全设计

`nbtca schedule login` 要输入教务系统的学号和密码，Prompt 为此做了几层保护：

- 密码只能在终端里输入且不回显，不接受命令行参数、环境变量或文件；提交前按学校登录页相同的方式加密，用完即从内存清零；
- 只保存登录会话，文件在 `~/.local/state/nbtca/session.json`（Windows 在 `%LOCALAPPDATA%\nbtca`），7 天后过期；在 macOS 和 Linux 上，目录和文件都只有本人可读写；
- 会话里的学号只保留最后两位；
- 只允许访问学校统一认证和教务系统的固定地址；遇到验证码等需要浏览器的环节直接失败，不尝试绕过；
- `--one-shot` 既不读取也不保存会话，适合在公用电脑上用。

导出的课表文件包含个人信息，不要随手分享。

## 技术栈

TypeScript，没有使用任何终端界面框架，标签页、列表、快捷键都是自己实现的，中英两套界面文案各有三百多个词条。文档浏览用 [@nbtca/docs](https://www.npmjs.com/package/@nbtca/docs) 从本站的 GitHub 仓库读取 Markdown，活动与课表处理用 [nbtcal](/concepts/calendar-feeds#nbtcal-库)，Markdown 渲染用 [marked](https://marked.js.org/)。

## 参与开发

```bash
git clone https://github.com/nbtca/Prompt.git
cd Prompt
npm ci
npm run check
```

`npm run check` 依次跑格式检查、ESLint、TypeScript 类型检查、七百多个测试、打包检查和依赖安全审计，全部通过才能发布。打 `v*` tag 后由 GitHub Actions 发布到 npm，版本说明在 [GitHub Releases](https://github.com/nbtca/Prompt/releases)。

适合上手的任务：

- `nbtca --help` 里 `events` 一行没有说明，原因是两种语言文件里的 `menu.eventsDesc` 都是空字符串；
- README 的命令列表只写了一半，`website`、`theme`、`lang`、`update` 等命令和大部分参数都没列；
- 仓库 [Wiki](https://github.com/nbtca/Prompt/wiki) 的开发步骤还写着 pnpm，版本说明停在 1.0.9，需要更新或改为指向 Releases；
- `assets/` 里的演示动图录于 2025 年 6 月的旧版界面，需要重录，最好换成更小的格式。

需要先讨论的：开学第一周现在推断不出来，课表页只能手动填，根源在 nbtcal 与校历数据的约定，见[协会日历](/concepts/calendar-feeds#nbtcal-库)。

〔以上为**最后核对 2026-09** 时的状态。〕

维护者是 [m1ngsama](https://github.com/m1ngsama)。仓库地址：[github.com/nbtca/Prompt](https://github.com/nbtca/Prompt)。

## 沿革

- **2025 年 6 月**：以 `@nbtca/welcome` 为名发布到 npm，是一个终端里的欢迎页；
- **2025 年 11 月**：重新设计，更名为 `@nbtca/prompt` 并发布 1.0.0，旧包标记为已迁移；
- **2026 年 7 月**：加入个人课表的登录与导出，并把原来的菜单式交互改写成带标签页的完整应用；
- **2026 年 9 月**：发布 1.5.10，npm 上累计四十多个版本。

## 相关

其他项目见[基础设施与项目](/about/infrastructure)。
