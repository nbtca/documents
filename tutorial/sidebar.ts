import { group, pageInGroup, pageInSection } from '../utils/navigation'

export const sidebar = [
  pageInSection('说明', 'tutorial', 'index'),
  group({
    text: '教程和指南',
    collapsed: false,
    base: '/tutorial/2025/',
    items: [
      pageInGroup('社团自建 Tailscale 使用指南', 'tailscale-usage'),
      pageInGroup('快速上手你的 nginx', 'nginx-usage'),
      pageInGroup('社团自建日历管理指南', 'google-calendar'),
      pageInGroup('C盘清理标准化流程', 'clean-drive-c'),
      pageInGroup('快速上手NBTCA的Github工作流', 'github-workflow'),
      pageInGroup('教育邮箱使用指南', 'edu-email'),
      pageInGroup('Github Education 认证指南', 'github-education-verification'),
    ],
  }),
]
