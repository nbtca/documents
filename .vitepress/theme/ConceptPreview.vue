<script setup lang="ts">
import type { PagePreview } from './concepts.data'
import { onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { data as pages } from './concepts.data'

// Build-time map: page URL path -> its preview. Every internal link previews.
const map = new Map(pages.map(p => [p.path, p]))

const card = ref<HTMLElement | null>(null)
const state = reactive({
  visible: false,
  title: '',
  summary: '',
  x: 0,
  y: 0,
  placement: 'below' as 'below' | 'above',
})

let showTimer: ReturnType<typeof setTimeout> | undefined
let hideTimer: ReturnType<typeof setTimeout> | undefined
let current: HTMLAnchorElement | null = null

function pathFromHref(href: string): string | null {
  try {
    const url = new URL(href, location.origin)
    if (url.origin !== location.origin)
      return null
    let p = url.pathname.replace(/\.html$/, '')
    if (p.endsWith('/index'))
      p = p.slice(0, -'index'.length)
    return p
  }
  catch {
    return null
  }
}

function anchorFrom(target: EventTarget | null): HTMLAnchorElement | null {
  let el = target as HTMLElement | null
  while (el && el !== document.body) {
    if (
      el.tagName === 'A'
      && el.closest('.vp-doc')
      && !el.classList.contains('header-anchor')
    ) {
      return el as HTMLAnchorElement
    }
    el = el.parentElement
  }
  return null
}

function place(a: HTMLAnchorElement, preview: PagePreview) {
  const r = a.getBoundingClientRect()
  state.title = preview.title
  state.summary = preview.summary
  state.placement = window.innerHeight - r.bottom < 200 ? 'above' : 'below'
  state.x = Math.min(Math.max(12, r.left), window.innerWidth - 332)
  state.y = state.placement === 'below' ? r.bottom + 10 : r.top - 10
  state.visible = true
}

function scheduleShow(a: HTMLAnchorElement) {
  const p = pathFromHref(a.href)
  const preview = p ? map.get(p) : undefined
  if (!preview)
    return
  clearTimeout(hideTimer)
  clearTimeout(showTimer)
  current = a
  showTimer = setTimeout(() => place(a, preview), 220)
}

function scheduleHide() {
  clearTimeout(showTimer)
  clearTimeout(hideTimer)
  hideTimer = setTimeout(() => {
    state.visible = false
    current = null
  }, 160)
}

function onOver(e: MouseEvent) {
  const a = anchorFrom(e.target)
  if (a && a !== current)
    scheduleShow(a)
}

function onOut(e: MouseEvent) {
  const a = anchorFrom(e.target)
  if (!a || a !== current)
    return
  const to = e.relatedTarget as Node | null
  if (card.value && to && card.value.contains(to))
    return
  scheduleHide()
}

function onFocusIn(e: FocusEvent) {
  const a = anchorFrom(e.target)
  if (a)
    scheduleShow(a)
}

function onFocusOut() {
  scheduleHide()
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape')
    state.visible = false
}

function keepOpen() {
  clearTimeout(hideTimer)
}

onMounted(() => {
  // Progressive enhancement: only devices that actually hover get the card.
  // Touch / no-hover users simply follow the link to the full concept page.
  if (window.matchMedia('(hover: hover)').matches) {
    document.addEventListener('mouseover', onOver)
    document.addEventListener('mouseout', onOut)
  }
  document.addEventListener('focusin', onFocusIn)
  document.addEventListener('focusout', onFocusOut)
  document.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('mouseover', onOver)
  document.removeEventListener('mouseout', onOut)
  document.removeEventListener('focusin', onFocusIn)
  document.removeEventListener('focusout', onFocusOut)
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <ClientOnly>
    <Teleport to="body">
      <Transition name="nb-cp">
        <div
          v-if="state.visible"
          ref="card"
          class="nb-concept-card"
          :class="`is-${state.placement}`"
          :style="{ left: `${state.x}px`, top: `${state.y}px` }"
          role="tooltip"
          @mouseenter="keepOpen"
          @mouseleave="scheduleHide"
        >
          <div class="nb-cp-kicker">
            词条
          </div>
          <div class="nb-cp-title">
            {{ state.title }}
          </div>
          <p v-if="state.summary" class="nb-cp-summary">
            {{ state.summary }}
          </p>
        </div>
      </Transition>
    </Teleport>
  </ClientOnly>
</template>
