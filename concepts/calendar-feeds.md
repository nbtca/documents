---
maintainers:
  - user: m1ngsama
    since: 2026-09
---

# 协会日历

协会日历是 NBTCA 以 [iCalendar](https://www.rfc-editor.org/rfc/rfc5545)（ICS）格式发布的日历订阅源，部署在 ical.nbtca.space，提供协会活动和[校历](./school-calendar)两份日程。源码在 [calendar](https://github.com/nbtca/calendar) 仓库，配套的 TypeScript 库是 [nbtcal](https://github.com/nbtca/nbtcal)。

## 订阅

把下面的地址加进任何支持订阅的日历应用（Google 日历、Apple 日历、Outlook 等），日程会自动更新。Google 日历的操作见 [Google Calendar 使用指南](/tutorial/manual/google-calendar)。

- `https://ical.nbtca.space/events.ics`：协会活动；
- `https://ical.nbtca.space/school.ics`：校历，包括报到注册、开学上课、放假、调课和期末考试周等全天事件。

〔截至**最后核对 2026-09**，活动源与校历尚未拆成两份独立数据，`/events.ics` 与根路径 `/` 返回同一份合并日程，拆分进度见 [calendar#1](https://github.com/nbtca/calendar/issues/1)。〕

协会主页的[日历页](https://nbtca.space/calendar)、命令行工具 [Prompt](./prompt) 和群机器人 [HuaJiBot.NET](./huajibot) 的日历提醒，读的都是这里的数据。

## calendar 仓库

一个 [Cloudflare Worker](https://developers.cloudflare.com/workers/)。活动源代理自协会的 Google 日历；校历从 `data/school/` 下按学年划分的 YAML 文件生成，目前覆盖 2022–2023 至 2026–2027 学年。

```bash
git clone https://github.com/nbtca/calendar.git
cd calendar
pnpm install
pnpm check
pnpm dev
```

新学年校历发布后，照 `data/school/README.md` 的字段说明补一个 YAML 文件，就是一次完整的贡献。YAML 里的结束日期字段叫 `endDateExclusive`，填的是最后一天的次日，这是 ICS 的规定，照填可以避免差一天的错误。

主要维护者是 [wen-templari](https://github.com/wen-templari)。

## nbtcal 库

[@nbtca/nbtcal](https://www.npmjs.com/package/@nbtca/nbtcal) 是读取上述订阅源的 TypeScript 库，负责解析 ICS、展开重复事件、按日期查询、生成热力图数据和输出 ICS。它的 `timetable` 子模块还能把学校教务系统里的个人课表转成日历，但登录由调用方负责，库本身不接触账号密码。

```bash
npm install @nbtca/nbtcal
```

维护者是 [m1ngsama](https://github.com/m1ngsama)。仓库地址：[github.com/nbtca/nbtcal](https://github.com/nbtca/nbtcal)。

## 相关

其他项目见[基础设施与项目](/about/infrastructure)。
