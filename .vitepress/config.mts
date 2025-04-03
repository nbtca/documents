import { withMermaid } from 'vitepress-plugin-mermaid';
import { sidebar as sidebarArchived } from '../archived/sidebar';
import { sidebar as sidebarProcess } from '../process/sidebar';

// https://vitepress.dev/reference/site-config
export default withMermaid({
  title: '计算机协会文档',
  description: 'Documents for nbtca',
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: '流程', link: '/process/borrow-classroom' },
      { text: '维修', link: '/repair/guide' },
      { text: '存档', link: '/archived' },
    ],
    search: {
      provider: 'local',
    },
    sidebar: {
      '/process/': sidebarProcess,
      '/repair/': [
        { text: '维修操作指南', link: '/repair/guide' },
        { text: 'Tools', link: '/repair/tools' },
      ],
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
  ignoreDeadLinks: true,
  lastUpdated: true,
});
