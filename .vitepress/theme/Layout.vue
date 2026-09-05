<script setup lang="ts">
import DefaultTheme from 'vitepress/theme'
import ArchiveMeta from './ArchiveMeta.vue'
import ConceptPreview from './ConceptPreview.vue'
import CurrentOutline from './CurrentOutline.vue'
import HubBackLink from './HubBackLink.vue'
import ImageZoom from './ImageZoom.vue'
import Maintainers from './Maintainers.vue'

const { Layout } = DefaultTheme
</script>

<template>
  <Layout>
    <template #doc-before>
      <HubBackLink />
      <ArchiveMeta class="nb-archive-meta-inline" />
    </template>
    <!-- Wide enough for the right rail: the record sits above the outline, so
         the title and the prose keep their full width. -->
    <template #aside-outline-before>
      <ArchiveMeta class="nb-archive-meta-aside" />
      <CurrentOutline />
    </template>
    <!-- Before the footer, so the note about who keeps the page sits with the
         article rather than under the edit link. -->
    <template #doc-footer-before>
      <Maintainers />
    </template>
    <template #layout-bottom>
      <ConceptPreview />
      <ImageZoom />
    </template>
  </Layout>
</template>

<style>
/* Replace only the desktop outline; keep VitePress's native mobile outline. */
.VPDocAside > .VPDocAsideOutline {
  display: none !important;
}
</style>
