<script setup lang="ts">
import DefaultTheme from 'vitepress/theme'
import ConceptPreview from './ConceptPreview.vue'
import HubBackLink from './HubBackLink.vue'

const { Layout } = DefaultTheme
</script>

<template>
  <Layout>
    <template #doc-before>
      <HubBackLink />
    </template>
    <template #layout-bottom>
      <ConceptPreview />
    </template>
  </Layout>
</template>
