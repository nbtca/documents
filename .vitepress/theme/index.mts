import type { EnhanceAppContext, Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import Layout from './Layout.vue'
import './style.css'

let transitionTimer: number | undefined

function getPageContent() {
  return document.querySelector<HTMLElement>('.VPDoc, .VPContent')
}

function clearTransition(content: HTMLElement) {
  content.classList.remove('page-transition-enter')
  transitionTimer = undefined
}

export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ router }: EnhanceAppContext) {
    if (typeof window === 'undefined')
      return

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

    router.onAfterRouteChanged = () => {
      if (reduceMotion.matches)
        return

      const content = getPageContent()
      if (!content)
        return

      if (transitionTimer)
        window.clearTimeout(transitionTimer)

      content.classList.remove('page-transition-leave')
      content.classList.add('page-transition-enter')
      transitionTimer = window.setTimeout(() => clearTransition(content), 200)
    }

    router.onBeforeRouteChange = () => {
      if (reduceMotion.matches)
        return

      const content = getPageContent()
      if (content)
        content.classList.add('page-transition-leave')
    }
  },
} satisfies Theme
