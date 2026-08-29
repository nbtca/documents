---
maintainers:
  - user: m1ngsama
    since: 2026-07
---

# 报修小程序

“NBT电脑维修”是 NBTCA 早年的微信小程序报修入口（前端代号 Hawaii）。它已不再维护，报修现在走协会主页的[预约维修](https://nbtca.space/repair/create-ticket)。

## 为什么下线

维修工单一度有三个入口：这个小程序负责建单，repair.nbtca.space 负责工单与成员管理，而协会主页的 `/repair` 两件事都能做。日常维修实际上都在主页那条路上跑，另外两个入口长期没人维护，因此协会决定收敛到一处，把开发精力放在单一平台上。

弃用计划见 [Roadmap#64](https://github.com/nbtca/Roadmap/issues/64)。按该 issue，正式关停前还要先完成成员 onboarding 流程，并把印着小程序二维码的旧海报换成指向主页的新版；截至**最后核对 2026-08**，这两件事尚未完成，issue 仍处于 open。

## 相关

报修之后工单怎么流转，见[维修工单系统](/repair/weekend)；项目本身见[基础设施与项目](/about/infrastructure)。
