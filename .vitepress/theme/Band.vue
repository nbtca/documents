<script setup lang="ts">
defineProps<{
  src: string
  alt: string
  quote?: string
  attribution?: string
  source?: string
}>()
</script>

<template>
  <section class="nb-band">
    <img :src="src" :alt="alt" loading="lazy" decoding="async">
    <blockquote v-if="quote" class="nb-band-quote">
      <p>{{ quote }}</p>
      <cite v-if="attribution">{{ attribution }}</cite>
    </blockquote>
    <p v-if="source" class="nb-band-stamp">
      {{ source }}
    </p>
  </section>
</template>
