<script setup lang="ts">
import { useData } from 'vitepress'
import { computed } from 'vue'

const { page, theme } = useData()

// A fixed locale keeps server and browser agreed, so the date ships rendered.
const FORMAT = new Intl.DateTimeFormat('zh-CN', { dateStyle: 'long', timeZone: 'Asia/Shanghai' })

const stamp = computed(() => page.value.lastUpdated)
const text = computed(() => stamp.value ? FORMAT.format(new Date(stamp.value)) : '')
const label = computed(() => theme.value.lastUpdatedText ?? '最后更新于')
</script>

<template>
  <p v-if="text" class="VPLastUpdated">
    {{ label }}: <time :datetime="new Date(stamp!).toISOString()">{{ text }}</time>
  </p>
</template>
