<script setup lang="ts">
defineProps<{
  src: string
  alt: string
  caption?: string
  date?: string
  source?: string
  wide?: boolean
  tall?: boolean
}>()
</script>

<template>
  <figure class="nb-figure" :class="{ 'is-wide': wide, 'is-tall': tall }">
    <img :src="src" :alt="alt" loading="lazy" decoding="async">
    <figcaption v-if="caption || date || source">
      <span v-if="caption" class="nb-fig-caption">{{ caption }}</span>
      <span v-if="date || source" class="nb-fig-stamp">
        <span v-if="date">{{ date }}</span>
        <span v-if="date && source" aria-hidden="true"> · </span>
        <span v-if="source">{{ source }}</span>
      </span>
    </figcaption>
  </figure>
</template>
