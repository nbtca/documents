import { withMermaid } from 'vitepress-plugin-mermaid'
import { sidebar as sidebarAbout } from '../about/sidebar'
import { sidebar as sidebarArchived } from '../archived/sidebar'
import { sidebar as sidebarGuide } from '../tutorial/sidebar'

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
      { text: '关于', link: '/about/' },
      { text: '指南', link: '/tutorial/' },
      { text: '维修', link: '/repair/' },
    ],
    search: {
      provider: 'local',
    },
    sidebar: {
      '/about/': sidebarAbout,
      // Guide = tutorial + process; one shared sidebar mounted on both paths.
      '/tutorial/': sidebarGuide,
      '/process/': sidebarGuide,
      // repair and concepts use a hub + inline-link + search model; no full sidebar.
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
  // Repo-governance docs are tracked in git but must not be published as
  // site pages (they would otherwise leak into search and the sitemap as
  // orphan pages with no navigation entry).
  srcExclude: [
    'README.md',
    'CONTRIBUTING.md',
    'CONTEXT.md',
    'docs/**',
  ],
  lastUpdated: true,
  sitemap: { hostname: 'https://docs.nbtca.space' },
})
