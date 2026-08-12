<script setup lang="ts">
// Portal grid. Children are LinkCard, which keeps each image URL a static
// prop so the compiler still rewrites it (an array of paths would not be).
</script>

<template>
  <nav class="nb-cards">
    <slot />
  </nav>
</template>
