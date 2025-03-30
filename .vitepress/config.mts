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

    socialLinks: [
      { icon: 'github', link: 'https://github.com/nbtca/documents' }
    ]
  },
  ignoreDeadLinks: true
})
