---
maintainers:
  - user: m1ngsama
    since: 2026-09
---

# 协会日历

协会日历是 NBTCA 以 [iCalendar](https://www.rfc-editor.org/rfc/rfc5545)（ICS）格式发布的日历订阅源，部署在 ical.nbtca.space，提供协会活动和[校历](./school-calendar)两份日程。源码在 [calendar](https://github.com/nbtca/calendar) 仓库，读取这些数据的 TypeScript 库是 [nbtcal](https://github.com/nbtca/nbtcal)。

<FactStrip :facts="[
  { label: '技术', value: 'Cloudflare Worker · ICS' },
  { label: '线上', value: 'ical.nbtca.space' },
  { label: '始于', value: '2024 年' },
  { label: '维护', value: 'wen-templari' },
]" />

## 订阅

把下面的地址加进任何支持订阅的日历应用（Google 日历、Apple 日历、Outlook 等），日程会自动更新。Google 日历的操作见 [Google Calendar 使用指南](/tutorial/manual/google-calendar)。协会主页的[日历页](https://nbtca.space/calendar)上方也有一个“订阅”按钮。

- `https://ical.nbtca.space/events.ics`：协会活动，例会、讲座、分享会都在这里；
- `https://ical.nbtca.space/school.ics`：校历，包括报到注册、开学上课、放假、调课和期末考试周等全天事件。

读取这些数据的地方：

| 使用方                                           | 读取的地址                            |
| ------------------------------------------------ | ------------------------------------- |
| 协会主页的[日历页](https://nbtca.space/calendar) | 根路径 `/`，与 `/events.ics` 内容相同 |
| 命令行工具 [Prompt](./prompt)                    | 根路径 `/`，经 nbtcal 读取            |
| 群机器人 [HuaJiBot.NET](./huajibot) 的日程提醒   | `/events.ics`，每 15 分钟同步一次     |
| 状态页 [heartbeat](./heartbeat)                  | 根路径 `/`，每 5 分钟检查一次是否在线 |

## calendar 仓库

一个没有运行时依赖的 [Cloudflare Worker](https://developers.cloudflare.com/workers/)，代码在 `src/index.js`：

- **活动源**：代理协会在 Google 日历上维护的公开日历。上游超时、出错或返回的不是日历时，改为返回上一次成功取到的内容，并在响应头里标上 `X-Calendar-Stale: 1`；
- **校历**：从 `data/school/` 下按学年划分的 YAML 文件生成，目前覆盖 2022–2023 至 2026–2027 五个学年、共 85 个事件，构建时生成 `dist/school.ics`。

```bash
git clone https://github.com/nbtca/calendar.git
cd calendar
pnpm install
pnpm check
pnpm dev
```

`pnpm check` 会重新生成校历并跑测试，PR 上的 CI 跑的也是它。部署是手动的：先部署预览版、核对每个地址，再替换线上版本。

新学年校历发布后，照 `data/school/README.md` 的字段说明补一个 YAML 文件，就是一次完整的贡献。结束日期字段叫 `endDateExclusive`，填的是最后一天的次日，这是 ICS 的规定，照填可以避免差一天的错误：

```yaml
startDate: 2026-09-14
endDateExclusive: 2026-09-15
```

主要维护者是 [wen-templari](https://github.com/wen-templari)。

## nbtcal 库

[@nbtca/nbtcal](https://www.npmjs.com/package/@nbtca/nbtcal) 是读取上述订阅源的 TypeScript 库，唯一的运行时依赖是 [ical.js](https://github.com/kewisch/ical.js)，负责解析 ICS、展开重复事件、按日期查询、生成热力图数据和输出 ICS：

```ts
import { loadCalendar } from '@nbtca/nbtcal'

const calendar = await loadCalendar()
const upcoming = calendar.upcoming({ days: 30 })
```

它的 `@nbtca/nbtcal/timetable` 子模块还能把学校教务系统里的个人课表转成日历。登录由调用方负责，库本身不接触账号密码。

```bash
npm install @nbtca/nbtcal
```

需要先讨论的：nbtcal 靠带 `[NBT]` 前缀的“秋季学期开始上课”等标题推断开学第一周，但校历拆出去之后，两个订阅源里都已经没有这类标题，推断会落空，Prompt 课表页因此需要手动填开学日期。修复要同时改库和数据约定。

维护者是 [m1ngsama](https://github.com/m1ngsama)。仓库地址：[github.com/nbtca/nbtcal](https://github.com/nbtca/nbtcal)。

## 沿革

ical.nbtca.space 至少在 2024 年 5 月就已上线，协会主页的日历页从那时起读取它；当时的 Worker 代码没有进仓库，校历也和活动混在同一个 Google 日历里，标题带 `[NBT]` 前缀。2026 年 9 月，Worker 的代码进了 calendar 仓库，校历改由 YAML 生成、独立发布。

nbtcal 于 2026 年 1 月以命令行工具起步，6 月改写为只处理数据的库，7 月加入课表支持。

[2023 年 11 月的例会](/archived/2023/meetings/2023-11-04-meeting)讨论过成员生日提醒：当时日程只放在苹果日历里，提醒方案在 QQ 机器人、钉钉和内网主页之间还没有定。

〔以上为**最后核对 2026-09** 时的状态。〕

## 相关

其他项目见[基础设施与项目](/about/infrastructure)。
