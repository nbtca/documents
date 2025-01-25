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
      { text: 'Meeting Minutes', link: '/meetings' }
    ],

    sidebar: [
      ...getMeetingMinutesSidebar()
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/vuejs/vitepress' }
    ]
  }
})
