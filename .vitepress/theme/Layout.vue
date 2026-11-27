<script setup lang="ts">
import DefaultTheme from 'vitepress/theme'
import ConceptPreview from './ConceptPreview.vue'
import HubBackLink from './HubBackLink.vue'
import ImageZoom from './ImageZoom.vue'
import PageCard from './PageCard.vue'

const { Layout } = DefaultTheme
</script>

<template>
  <Layout>
    <!-- The card rides the right rail where there is one, and falls back to a
         block above the title where the rail is hidden. -->
    <template #doc-before>
      <HubBackLink />
      <PageCard class="nb-page-card-inline" />
    </template>
    <template #aside-outline-before>
      <PageCard class="nb-page-card-aside" />
    </template>
    <template #layout-bottom>
      <ConceptPreview />
      <ImageZoom />
    </template>
  </Layout>
</template>
