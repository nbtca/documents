<script setup lang="ts">
withDefaults(defineProps<{ wide?: boolean }>(), { wide: true })
</script>

<template>
  <div class="nb-figure-grid" :class="{ 'is-wide': wide }">
    <slot />
  </div>
</template>
