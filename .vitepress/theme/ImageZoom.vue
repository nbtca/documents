<script setup lang="ts">
import { useRoute } from 'vitepress'
import { nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'

// Hero and band images are already full-bleed; enlarging them gains nothing.
const EXCLUDED = '.nb-hero-img, .nb-band img, .VPNavBar img, a img'

const dialog = ref<HTMLDialogElement | null>(null)
const state = reactive({ src: '', alt: '' })
const route = useRoute()

function zoomable(el: Element | null): el is HTMLImageElement {
  return !!el && el.tagName === 'IMG' && !!el.closest('.vp-doc') && !el.matches(EXCLUDED)
}

function open(img: HTMLImageElement) {
  state.src = img.currentSrc || img.src
  state.alt = img.alt
  dialog.value?.showModal()
}

function close() {
  dialog.value?.close()
}

function onClick(e: MouseEvent) {
  const el = e.target as Element | null
  if (zoomable(el))
    open(el)
}

function onKeydown(e: KeyboardEvent) {
  if (e.key !== 'Enter' && e.key !== ' ')
    return
  const el = document.activeElement
  if (zoomable(el)) {
    e.preventDefault()
    open(el)
  }
}

// img is not focusable by default, so the zoom would be mouse-only.
function markZoomable() {
  for (const img of document.querySelectorAll<HTMLImageElement>('.vp-doc img')) {
    if (img.matches(EXCLUDED) || img.dataset.zoomable)
      continue
    img.dataset.zoomable = 'true'
    img.tabIndex = 0
    img.setAttribute('role', 'button')
    img.setAttribute('aria-label', img.alt ? `放大：${img.alt}` : '放大图片')
  }
}

onMounted(() => {
  markZoomable()
  document.addEventListener('click', onClick)
  document.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onClick)
  document.removeEventListener('keydown', onKeydown)
})

watch(() => route.path, () => nextTick(markZoomable))
</script>

<template>
  <ClientOnly>
    <Teleport to="body">
      <dialog ref="dialog" class="nb-zoom" @click="close" @close="state.src = ''">
        <img v-if="state.src" :src="state.src" :alt="state.alt">
        <p v-if="state.alt" class="nb-zoom-alt">
          {{ state.alt }}
        </p>
      </dialog>
    </Teleport>
  </ClientOnly>
</template>
