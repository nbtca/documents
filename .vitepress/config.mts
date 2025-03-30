import { defineConfig } from 'vitepress'
import { getMeetingMinutesSidebar } from '../meetings/sidebar'


// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "Documents",
  description: "Documents for nbtca",
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Home', link: '/' },
      { text: '会议记录', link: '/meetings' }
    ],
    search: {
      provider: "local"
    },
    sidebar: [
      {
        text: '会议记录',
        link: '/meetings'
      },
      ...getMeetingMinutesSidebar()
    ],
    editLink: {
      pattern: 'https://github.com/nbtca/documents/edit/main/:path',
      text: 'Edit this page on GitHub'
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/nbtca/documents' }
    ]
  },
  ignoreDeadLinks: true,
  lastUpdated: true,
})
