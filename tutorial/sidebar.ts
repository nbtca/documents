import { group, pageInGroup, pageInSection } from '../utils/navigation'

// 「指南」= 教程（学技术）+ 流程（办社务）高内聚合并为一栏，同一份边栏同时挂在
// /tutorial/ 与 /process/ 下。发现内容还有 ⌘K 搜索与站内 wiki 内链兜底。
export const sidebar = [
  pageInSection('指南', 'tutorial', 'index'),
  group({
    text: '流程',
    collapsed: false,
    base: '/process/2025/',
    items: [
      pageInGroup('借教室', 'borrow-classroom'),
      pageInGroup('申请第二课堂学分', 'apply-for-credits'),
      pageInGroup('报销流程', 'reimbursement-process'),
      pageInGroup('撰写并发布你的第一篇 NBTCA 博客', 'nbtca-post'),
      pageInGroup('活动组织（待完善）', 'event-organization'),
    ],
  }),
  group({
    text: '教程',
    collapsed: false,
    base: '/tutorial/2025/',
    items: [
      pageInGroup('快速上手 NBTCA 的 GitHub 工作流', 'github-workflow'),
      pageInGroup('GitHub Education 认证指南', 'github-education-verification'),
      pageInGroup('教育邮箱用途', 'edu-email'),
      pageInGroup('社团自建 Tailscale 使用指南', 'tailscale-usage'),
      pageInGroup('快速上手 nginx', 'nginx-usage'),
      pageInGroup('谷歌日历使用指南', 'google-calendar'),
      pageInGroup('C 盘清理标准化流程', 'clean-drive-c'),
    ],
  }),
  group({
    text: '手册',
    collapsed: false,
    base: '/tutorial/manual/',
    items: [
      pageInGroup('CA101', 'ca101'),
      pageInGroup('CA102', 'ca102'),
      pageInGroup('计算机硬件系统的搭建与维护', 'hardware-establish'),
      pageInGroup('从零开始安装 Windows', 'windows-from-scratch'),
      pageInGroup('基础操作系统的使用技术', 'os-skills'),
      pageInGroup('国际互联网的使用', 'net-usage'),
    ],
  }),
]
