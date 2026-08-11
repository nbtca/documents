<script setup lang="ts">
defineProps<{
  href: string
  title: string
  desc: string
  src: string
  alt: string
}>()
</script>

<template>
  <a class="nb-card" :href="href">
    <img :src="src" :alt="alt" loading="lazy" decoding="async">
    <span class="nb-card-body">
      <span class="nb-card-title">{{ title }}</span>
      <span class="nb-card-desc">{{ desc }}</span>
    </span>
  </a>
</template>
