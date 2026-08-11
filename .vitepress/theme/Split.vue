<script setup lang="ts">
// Image beside prose. Alternate `reverse` down a page to build rhythm.
defineProps<{
  src: string
  alt: string
  /** Small monospace label above the heading. */
  kicker?: string
  heading?: string
  /** Photo on the left instead of the right. */
  reverse?: boolean
}>()
</script>

<template>
  <section class="nb-split" :class="{ 'is-reverse': reverse }">
    <div class="nb-split-media">
      <img :src="src" :alt="alt" loading="lazy" decoding="async">
    </div>
    <div class="nb-split-body">
      <p v-if="kicker" class="nb-split-kicker">
        {{ kicker }}
      </p>
      <h3 v-if="heading" class="nb-split-heading">
        {{ heading }}
      </h3>
      <slot />
    </div>
  </section>
</template>
