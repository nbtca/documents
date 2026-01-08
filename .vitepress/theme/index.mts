import type { EnhanceAppContext, Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import './style.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app, router }: EnhanceAppContext) {
    // 监听路由变化，添加页面切换动画
    if (typeof window !== 'undefined') {
      // 首次加载时添加动画
      router.onAfterRouteChanged = () => {
        const content = document.querySelector('.VPDoc, .VPContent')
        if (content) {
          content.classList.remove('page-transition-leave')
          content.classList.add('page-transition-enter')
          setTimeout(() => {
            content.classList.remove('page-transition-enter')
          }, 400)
        }
      }
      
      router.onBeforeRouteChange = () => {
        const content = document.querySelector('.VPDoc, .VPContent')
        if (content) {
          content.classList.add('page-transition-leave')
        }
      }
    }
  },
} satisfies Theme