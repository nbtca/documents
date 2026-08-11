<script setup lang="ts">
// Full-bleed opening band for flagship pages. Carries the page title, so the
// markdown source omits its H1 (concepts.data.ts falls back to frontmatter).
withDefaults(defineProps<{
  src: string
  alt: string
  kicker?: string
  title: string
  lede?: string
  /** Provenance stamp, e.g. "协会照片档案". */
  source?: string
  /** Light text needs a darker scrim on busy photos. */
  scrim?: 'soft' | 'strong'
}>(), { scrim: 'soft' })
</script>

<template>
  <header class="nb-hero" :class="`scrim-${scrim}`">
    <img class="nb-hero-img" :src="src" :alt="alt" fetchpriority="high" decoding="async">
    <div class="nb-hero-body">
      <p v-if="kicker" class="nb-hero-kicker">
        {{ kicker }}
      </p>
      <h1 class="nb-hero-title">
        {{ title }}
      </h1>
      <p v-if="lede" class="nb-hero-lede">
        {{ lede }}
      </p>
    </div>
    <p v-if="source" class="nb-hero-stamp">
      {{ source }}
    </p>
  </header>
</template>
