import type { EnhanceAppContext, Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import Band from './Band.vue'
import FactStrip from './FactStrip.vue'
import Figure from './Figure.vue'
import FigureGrid from './FigureGrid.vue'
import Layout from './Layout.vue'
import LinkCard from './LinkCard.vue'
import LinkCards from './LinkCards.vue'
import PageHero from './PageHero.vue'
import Split from './Split.vue'
import Timeline from './Timeline.vue'
import TimelineEntry from './TimelineEntry.vue'
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
  enhanceApp({ app, router }: EnhanceAppContext) {
    app.component('Band', Band)
    app.component('FactStrip', FactStrip)
    app.component('Figure', Figure)
    app.component('FigureGrid', FigureGrid)
    app.component('LinkCard', LinkCard)
    app.component('LinkCards', LinkCards)
    app.component('PageHero', PageHero)
    app.component('Split', Split)
    app.component('Timeline', Timeline)
    app.component('TimelineEntry', TimelineEntry)

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
