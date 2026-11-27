<script setup lang="ts">
import { AUTO_FIXED, codeParts, MARKDOWNLINT_CONFIG, RULE_FIXES, RULE_MESSAGES } from '../../utils/markdown-rules'

const off = new Set(Object.keys(MARKDOWNLINT_CONFIG))
const rules = Object.keys(RULE_MESSAGES)
  .filter(rule => !off.has(rule) && !AUTO_FIXED.has(rule) && RULE_FIXES[rule])
  .map(rule => ({ rule, message: RULE_MESSAGES[rule], fix: codeParts(RULE_FIXES[rule]) }))
</script>

<template>
  <dl class="nb-rules">
    <template v-for="item in rules" :key="item.rule">
      <dt :id="item.rule.toLowerCase()">
        <code>{{ item.rule }}</code> {{ item.message }}
        <a class="header-anchor" :href="`#${item.rule.toLowerCase()}`" :aria-label="`Permalink to ${item.rule}`">&ZeroWidthSpace;</a>
      </dt>
      <dd>
        <template v-for="(part, index) in item.fix" :key="index">
          <code v-if="part.code">{{ part.text }}</code><template v-else>
            {{ part.text }}
          </template>
        </template>
      </dd>
    </template>
  </dl>
</template>

<style scoped>
.nb-rules dt {
  margin-top: 16px;
  font-weight: 600;
  scroll-margin-top: calc(var(--vp-nav-height) + 24px);
}

.nb-rules dd {
  margin: 4px 0 0;
  color: var(--vp-c-text-2);
}
</style>
