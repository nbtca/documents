<script setup lang="ts">
// Key facts as a monospace strip. Same "machine voice" as maintainer stamps,
// so a reader can scan the hard facts before reading any prose.
defineProps<{
  facts: { label: string, value: string }[]
}>()
</script>

<template>
  <dl class="nb-facts">
    <div v-for="fact in facts" :key="fact.label" class="nb-fact">
      <dt>{{ fact.label }}</dt>
      <dd>{{ fact.value }}</dd>
    </div>
  </dl>
</template>
