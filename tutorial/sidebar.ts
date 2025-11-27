export const sidebar = [
  {
    text: '说明',
    link: '/tutorial/index',
  },
  {
    text: '教程和指南',
    collapsed: false,
    base: '/tutorial/2025/',
    items: [
      {
        text: '社团自建 Tailscale 使用指南',
        link: 'tailscale-usage',
      },
      {
        text: '快速上手你的 nginx',
        link: 'nginx-usage',
      },
      {
        text: '社团自建日历管理指南',
        link: 'google-calendar',
      },
    ],
  },
]
