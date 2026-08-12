<script setup lang="ts">
// One moment on the spine. The year sits in the monospace metadata voice so
// the chronology can be scanned without reading the prose.
defineProps<{
  year: string
  title?: string
  /** Marks the entries that changed how the club is organised. */
  pivot?: boolean
}>()
</script>

<template>
  <section class="nb-tl-entry" :class="{ 'is-pivot': pivot }">
    <p class="nb-tl-year">
      {{ year }}
    </p>
    <div class="nb-tl-body">
      <h3 v-if="title" class="nb-tl-title">
        {{ title }}
      </h3>
      <slot />
    </div>
  </section>
</template>
