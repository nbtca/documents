import { withMermaid } from 'vitepress-plugin-mermaid'
import { sidebar as sidebarAbout } from '../about/sidebar'
import { sidebar as sidebarArchived } from '../archived/sidebar'
import { sidebar as sidebarGuide } from '../tutorial/sidebar'

const siteDescription = '浙大宁波理工学院计算机协会（NBTCA）的公开文档站：认识社团、上手指南、流程手册与维修日资料。'

// https://vitepress.dev/reference/site-config
export default withMermaid({
  lang: 'zh-CN',
  title: '计算机协会文档',
  description: siteDescription,
  head: [
    ['link', { rel: 'icon', href: '/favicon.ico', sizes: 'any' }],
    ['link', { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' }],
    // Brand blue from the logo; keeps mobile browser chrome on-brand.
    ['meta', { name: 'theme-color', content: '#124689' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:site_name', content: '计算机协会文档' }],
    ['meta', { property: 'og:title', content: '计算机协会文档' }],
    ['meta', { property: 'og:description', content: siteDescription }],
    ['meta', { name: 'twitter:card', content: 'summary' }],
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
      options: {
        translations: {
          button: {
            buttonText: '搜索',
            buttonAriaLabel: '搜索文档',
          },
          modal: {
            displayDetails: '显示详细列表',
            resetButtonTitle: '清除查询条件',
            backButtonTitle: '关闭搜索',
            noResultsText: '未找到相关结果',
            footer: {
              selectText: '选择',
              selectKeyAriaLabel: '回车',
              navigateText: '切换',
              navigateUpKeyAriaLabel: '上箭头',
              navigateDownKeyAriaLabel: '下箭头',
              closeText: '关闭',
              closeKeyAriaLabel: 'esc',
            },
          },
        },
        miniSearch: {
          options: {
            // CJK has no word boundaries, so the default tokenizer keeps
            // whole Han runs and prefix search misses mid-sentence terms.
            // Index Han runs as bigrams instead. Must stay self-contained:
            // VitePress serializes it and rehydrates via new Function on
            // the client so queries tokenize the same way.
            tokenize: (text: string): string[] => {
              const tokens: string[] = []
              for (const seg of text.split(/[\n\r\p{Z}\p{P}]+/u)) {
                if (!seg)
                  continue
                for (const run of seg.match(/\p{Script=Han}+|\P{Script=Han}+/gu) ?? []) {
                  if (!/\p{Script=Han}/u.test(run) || run.length === 1) {
                    tokens.push(run)
                    continue
                  }
                  for (let i = 0; i < run.length - 1; i++)
                    tokens.push(run.slice(i, i + 2))
                }
              }
              return tokens
            },
          },
        },
      },
    },
    sidebar: {
      '/about/': sidebarAbout,
      // Guide = tutorial + process; one shared sidebar mounted on both paths.
      '/tutorial/': sidebarGuide,
      '/process/': sidebarGuide,
      // repair and concepts use a hub + inline-link + search model; no full sidebar.
      '/archived': sidebarArchived,
    },
    outline: {
      label: '本页目录',
    },
    docFooter: {
      prev: '上一页',
      next: '下一页',
    },
    lastUpdated: {
      text: '最后更新于',
    },
    darkModeSwitchLabel: '主题',
    lightModeSwitchTitle: '切换到浅色模式',
    darkModeSwitchTitle: '切换到深色模式',
    sidebarMenuLabel: '目录',
    returnToTopLabel: '回到顶部',
    skipToContentLabel: '跳到内容',
    editLink: {
      pattern: 'https://github.com/nbtca/documents/edit/main/:path',
      text: '在 GitHub 上编辑此页',
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/nbtca/documents' },
    ],
    notFound: {
      title: '页面未找到',
      quote: '这一页不存在或已被移动。可以回到首页，或用搜索找到它。',
      linkLabel: '回到首页',
      linkText: '回到首页',
    },
  },
  markdown: {
    image: {
      // Screenshots dominate page weight; defer offscreen ones.
      lazyLoading: true,
    },
  },
  // Split page metadata out of app.js so content-only edits keep its hash.
  metaChunk: true,
  // katex/wardley chunks are modulepreloaded on every page although only
  // mermaid diagrams may dynamically import them; drop the eager hint.
  shouldPreload: link => !/katex|wardley/i.test(link),
  // Asset URLs in props of our own components are plain strings to the
  // compiler; without this they ship unhashed and 404 in production. This map
  // replaces Vue's defaults wholesale, so the built-in tags are repeated here.
  vue: {
    template: {
      transformAssetUrls: {
        video: ['src', 'poster'],
        source: ['src'],
        img: ['src'],
        image: ['xlink:href', 'href'],
        use: ['xlink:href', 'href'],
        Band: ['src'],
        Figure: ['src'],
        PageHero: ['src'],
        Split: ['src'],
      },
    },
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
    'docs/**',
  ],
  lastUpdated: true,
  sitemap: { hostname: 'https://docs.nbtca.space' },
})
