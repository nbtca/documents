<script setup lang="ts">
// Photo with a provenance stamp. The stamp reuses the site's monospace
// "machine voice" so an image carries the same sourcing discipline as prose.
defineProps<{
  src: string
  alt: string
  /** Caption prose. Omit for images that speak for themselves. */
  caption?: string
  /** When the photo was taken, e.g. "2025-12". */
  date?: string
  /** Where it came from, e.g. "协会照片档案". */
  source?: string
  /** Break out of the prose column. */
  wide?: boolean
  /** Portrait images: cap the height instead of the width. */
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
