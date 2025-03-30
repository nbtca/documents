import { withMermaid } from "vitepress-plugin-mermaid"
import { sidebar as sidebarArchived } from "../archived/sidebar"

// https://vitepress.dev/reference/site-config
export default withMermaid({
  title: "计算机协会文档",
  description: "Documents for nbtca",
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: '流程', link: '/process/borrow-classroom' },
      { text: '维修', link: '/repair/tools' },
      { text: '存档', link: '/archived' }
    ],
    search: {
      provider: "local"
    },
    sidebar: {
      '/process/': [
        {
          text: '流程',
          items: [
            { text: '借教室', link: '/process/borrow-classroom' }
          ]
        }
      ],
      '/repair/': [
        {
          text: '维修',
          items: [
            { text: 'Tools', link: '/repair/tools' },
          ]
        }
      ],
      '/archived': sidebarArchived
    },
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
