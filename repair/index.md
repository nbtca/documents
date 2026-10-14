---
title: 维修
aside: false
summary: 维修队面向全校师生提供免费的电脑维修，一年办十次左右。
maintainers:
  - user: m1ngsama
    since: 2026-07
---

<PageHero
  src="./assets/repair-outdoor.webp"
  alt="树荫下几张长桌拼成工位，队员与同学围坐着检修笔记本，一名志愿者在旁等候"
  title="维修"
  lede="电脑坏了可以找我们，不收钱。一年办十次左右，全校师生都能来。"
  source="协会照片档案"
  scrim="strong"
/>

本栏包括四部分：怎样修电脑，怎样办维修日，怎样报修，以及维修用什么工具。

## 维修日

维修日是维修队定期面向全校举办的现场免费维修，一年约十次。它的前身是早年的[理工服务日](/concepts/service-day)。参与现场服务的同学按工作量获得[志愿者时长](/concepts/volunteer-hours)。筹备方法和当天的流程见[维修日](./repair-day)。

## 动手修一台机器

无论是处理蓝屏还是拆机换硅脂，都要先保证人身、财产和数据安全。操作方法分成下面几页：[故障诊断](./diagnosis)、[C 盘清理](./c-drive-cleanup)、[重新安装 Windows](./reinstall-windows)、[拆机与物理维护](./physical-maintenance)，以及[各厂商 BIOS 与一键恢复入口](./bios-keys)。总入口是[维修操作指南](./guide)。

## 报修与工单

要报修，在协会主页的[预约维修](https://nbtca.space/repair/create-ticket)建单，然后在[维修记录](https://nbtca.space/repair/history)中查看进度。队员使用[维修管理](https://nbtca.space/repair/admin)处理工单，需要登录。

第一次报修前，先登录 [NBTCA 账号](/concepts/nbtca-account)。如果没有账号，在登录页注册。

1. 打开 [nbtca.space/repair](https://nbtca.space/repair)，点“预约维修”。
2. 如果没有登录，页面显示登录提示。点“登入”。
3. 在账号登录页登录。你可以用邮箱、GitHub 或 Passkey 登录。没有账号时，点“注册”，用邮箱注册。
4. 登录后，页面自动回到报修表单。填写并提交表单。

<FigureGrid>
  <Figure src="../concepts/assets/project-home-repair.webp" alt="协会主页维修板块的入口页，一幅蓝色线描插画下写着“我们提供免费的电脑维修服务”，下方是“预约维修”按钮" caption="第 1 步：维修板块入口，点“预约维修”。" date="2026-09" />
  <Figure src="./assets/booking-login-hint.webp" alt="提示页标题为“登入账号后继续操作”，说明为了验证身份和记录维修信息需要先登录，下方是一个蓝色的“登入”按钮" caption="第 2 步：未登录时的提示页，点“登入”。" date="2026-09" />
</FigureGrid>

<Figure src="../concepts/assets/project-account-sign-in.webp" alt="NBTCA 账号的登录页，有用户名或邮箱输入框、登录按钮、注册链接，以及“通过 GitHub 继续”和“通过 通行证 继续”两个按钮" caption="第 3 步：NBTCA 账号登录页。没有账号的点“注册”，用邮箱收验证码即可。" date="2026-09" wide />

队员在面板上接单并提交维修描述，管理员审核后结单。工作量按 `size` 分档，折算成[志愿者时长](/concepts/volunteer-hours)。系统的工作方式见[工单系统](./weekend)。

早年的两个报修入口，[微信小程序“NBT电脑维修”](/concepts/repair-miniprogram)和 repair.nbtca.space，都已停止维护并计划下线。请用上面的方法报修。

## 工具、镜像与软件

维修常用的系统镜像、驱动、硬件检测工具和系统清理工具，都在[软件仓库索引](./tools)中。软件仓库只能在校园网内网访问，访问前要完成[校园网认证](/concepts/campus-network-auth)。

## 详细手册

下面三本详细手册在教程栏中：[选配并组装一台电脑](/tutorial/manual/hardware-establish)、[从零开始安装 Windows](/tutorial/manual/windows-from-scratch)、[操作系统技能](/tutorial/manual/os-skills)。它们还在改写中，欢迎补充。
