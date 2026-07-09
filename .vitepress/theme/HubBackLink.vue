<script setup lang="ts">
import { useRoute } from 'vitepress'
import { computed } from 'vue'

// On the no-sidebar hub sections, a deep page has no sibling nav — offer one
// light "back to hub" anchor. The hub pages themselves show nothing.
const hubs: Array<{ prefix: string, text: string, link: string }> = [
  { prefix: '/repair/', text: '维修', link: '/repair/' },
  { prefix: '/concepts/', text: '概念库', link: '/concepts/' },
]

const route = useRoute()

const hub = computed(() => {
  const path = route.path
  for (const h of hubs) {
    if (!path.startsWith(h.prefix))
      continue
    const rest = path.slice(h.prefix.length).replace(/\.html$/, '')
    if (rest === '' || rest === 'index')
      return null
    return h
  }
  return null
})
</script>

<template>
  <a v-if="hub" class="nb-hub-back" :href="hub.link">↑ 回{{ hub.text }}</a>
</template>
