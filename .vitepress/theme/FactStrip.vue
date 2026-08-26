<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  facts: { label: string, value: string }[]
}>()

// Cells show the container through 1px gaps, so a half-filled row reads as a
// missing cell rather than as whitespace.
const columns = computed(() => Math.min(props.facts.length, 4) || 1)
const lastSpan = computed(() => {
  const remainder = props.facts.length % columns.value
  return remainder === 0 ? 1 : columns.value - remainder + 1
})
</script>

<template>
  <dl class="nb-facts" :style="{ '--nb-fact-cols': columns }">
    <div
      v-for="(fact, index) in facts"
      :key="fact.label"
      class="nb-fact"
      :style="index === facts.length - 1 ? { '--nb-fact-span': lastSpan } : undefined"
    >
      <dt>{{ fact.label }}</dt>
      <dd>{{ fact.value }}</dd>
    </div>
  </dl>
</template>
