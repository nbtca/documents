import { withMermaid } from 'vitepress-plugin-mermaid'
import { sidebar as sidebarArchived } from '../archived/sidebar'
import { sidebar as sidebarProcess } from '../process/sidebar'
import { sidebar as sidebarRepair } from '../repair/sidebar'
import { sidebar as sidebarTutorial } from '../tutorial/sidebar'

// https://vitepress.dev/reference/site-config
export default withMermaid({
  title: '计算机协会文档',
  description: 'Documents for nbtca',
  head: [
    ['link', { rel: 'icon', href: '/favicon.ico', sizes: 'any' }],
    ['link', { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' }],
  ],
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: '教程', link: '/tutorial/' },
      { text: '流程', link: '/process/' },
      { text: '维修', link: '/repair/guide' },
      { text: '存档', link: '/archived' },
    ],
    search: {
      provider: 'local',
    },
    sidebar: {
      '/tutorial/': sidebarTutorial,
      '/process/': sidebarProcess,
      '/repair/': sidebarRepair,
      '/archived': sidebarArchived,
    },
    editLink: {
      pattern: 'https://github.com/nbtca/documents/edit/main/:path',
      text: 'Edit this page on GitHub',
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/nbtca/documents' },
    ],
  },
  ignoreDeadLinks: [
    /^https?:\/\//,
  ],
  lastUpdated: true,
  sitemap: { hostname: 'https://docs.nbtca.space' },
})
