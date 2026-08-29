<script setup lang="ts">
defineProps<{
  year: string
  title?: string
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
