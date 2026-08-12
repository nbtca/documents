<script setup lang="ts">
// Two-up photo row that collapses to a single column on narrow screens.
withDefaults(defineProps<{ wide?: boolean }>(), { wide: true })
</script>

<template>
  <div class="nb-figure-grid" :class="{ 'is-wide': wide }">
    <slot />
  </div>
</template>
