<script setup lang="ts">
import { getScrollOffset, onContentUpdated, useData, useRoute } from 'vitepress'
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'

interface OutlineHeading {
  id: string
  title: string
  element: HTMLElement
}

type OutlineSubsection = OutlineHeading & {
  children: OutlineHeading[]
}

type OutlineSection = OutlineHeading & {
  children: OutlineSubsection[]
}

const route = useRoute()
const { frontmatter } = useData()
const sections = ref<OutlineSection[]>([])
const activeId = ref('')
const activeSectionId = ref('')
const activeSubsectionId = ref('')
let scrollFrame = 0
let refreshFrame = 0
let disposed = false

function headingTitle(element: HTMLElement): string {
  const copy = element.cloneNode(true) as HTMLElement
  copy.querySelector('.header-anchor')?.remove()
  return copy.textContent?.trim() || element.id
}

function readHeadings(): void {
  const result: OutlineSection[] = []
  let currentSection: OutlineSection | undefined
  let currentSubsection: OutlineSubsection | undefined

  for (const element of document.querySelectorAll<HTMLElement>('.VPDoc .vp-doc :is(h2, h3, h4)')) {
    if (!element.id || element.classList.contains('ignore-header'))
      continue

    const heading: OutlineHeading = {
      id: element.id,
      title: headingTitle(element),
      element,
    }

    if (element.tagName === 'H2') {
      currentSection = { ...heading, children: [] }
      currentSubsection = undefined
      result.push(currentSection)
    }
    else if (element.tagName === 'H3' && currentSection) {
      currentSubsection = { ...heading, children: [] }
      currentSection.children.push(currentSubsection)
    }
    else if (element.tagName === 'H4' && currentSubsection) {
      currentSubsection.children.push(heading)
    }
  }

  sections.value = result
  updateActiveHeading()
}

function updateActiveHeading(): void {
  // Match VitePress anchor navigation, including the site's fixed navigation.
  const threshold = window.scrollY + getScrollOffset() + 4
  let activeHeading: OutlineHeading | undefined
  let activeSection: OutlineSection | undefined
  let activeSubsection: OutlineSubsection | undefined

  for (const section of sections.value) {
    const sectionTop = section.element.getBoundingClientRect().top + window.scrollY
    if (sectionTop <= threshold) {
      activeHeading = section
      activeSection = section
      activeSubsection = undefined
    }

    for (const subsection of section.children) {
      const subsectionTop = subsection.element.getBoundingClientRect().top + window.scrollY
      if (subsectionTop <= threshold) {
        activeHeading = subsection
        activeSection = section
        activeSubsection = subsection
      }

      for (const heading of subsection.children) {
        const top = heading.element.getBoundingClientRect().top + window.scrollY
        if (top <= threshold) {
          activeHeading = heading
          activeSection = section
          activeSubsection = subsection
        }
      }
    }
  }

  activeId.value = activeHeading?.id || ''
  activeSectionId.value = activeSection?.id || ''
  activeSubsectionId.value = activeSubsection?.id || ''
}

function scheduleActiveUpdate(): void {
  if (scrollFrame)
    return
  scrollFrame = window.requestAnimationFrame(() => {
    updateActiveHeading()
    scrollFrame = 0
  })
}

function refreshOutline(): void {
  nextTick(() => {
    if (disposed)
      return
    window.cancelAnimationFrame(refreshFrame)
    refreshFrame = window.requestAnimationFrame(readHeadings)
  })
}

onMounted(() => {
  readHeadings()
  window.addEventListener('scroll', scheduleActiveUpdate, { passive: true })
  window.addEventListener('resize', scheduleActiveUpdate, { passive: true })
})

watch(() => route.path, refreshOutline)
onContentUpdated(refreshOutline)

onUnmounted(() => {
  disposed = true
  window.cancelAnimationFrame(refreshFrame)
  window.cancelAnimationFrame(scrollFrame)
  window.removeEventListener('scroll', scheduleActiveUpdate)
  window.removeEventListener('resize', scheduleActiveUpdate)
})
</script>

<template>
  <nav v-if="sections.length && frontmatter.outline !== false" class="CurrentOutline" aria-label="本页目录">
    <div class="current-outline-title">
      本页目录
    </div>
    <ol class="current-outline-list">
      <li v-for="section in sections" :key="section.id" class="outline-section">
        <a
          class="current-outline-link level-two"
          :class="{ active: activeId === section.id }"
          :href="`#${encodeURIComponent(section.id)}`"
        >{{ section.title }}</a>

        <Transition name="outline-children">
          <ol v-if="section.children.length && activeSectionId === section.id" class="outline-children">
            <li v-for="child in section.children" :key="child.id">
              <a
                class="current-outline-link level-three"
                :class="{ active: activeId === child.id }"
                :href="`#${encodeURIComponent(child.id)}`"
              >{{ child.title }}</a>

              <Transition name="outline-children">
                <ol v-if="child.children.length && activeSubsectionId === child.id" class="outline-children level-four-list">
                  <li v-for="grandchild in child.children" :key="grandchild.id">
                    <a
                      class="current-outline-link level-four"
                      :class="{ active: activeId === grandchild.id }"
                      :href="`#${encodeURIComponent(grandchild.id)}`"
                    >{{ grandchild.title }}</a>
                  </li>
                </ol>
              </Transition>
            </li>
          </ol>
        </Transition>
      </li>
    </ol>
  </nav>
</template>

<style scoped>
.CurrentOutline {
  position: relative;
  border-left: 1px solid var(--vp-c-divider);
  padding-left: 16px;
}

.current-outline-title {
  line-height: 32px;
  color: var(--vp-c-text-1);
  font-size: 14px;
  font-weight: 600;
}

.current-outline-list,
.outline-children {
  margin: 0;
  padding: 0;
  list-style: none;
}

.outline-section {
  position: relative;
}

.current-outline-link {
  position: relative;
  display: block;
  overflow: hidden;
  color: var(--vp-c-text-2);
  font-size: 14px;
  font-weight: 400;
  line-height: 32px;
  text-overflow: ellipsis;
  text-decoration: none;
  white-space: nowrap;
  transition: color 200ms ease;
}

.current-outline-link:hover,
.current-outline-link.active {
  color: var(--vp-c-text-1);
}

.current-outline-link.active::before {
  content: '';
  position: absolute;
  top: 7px;
  left: -17px;
  width: 2px;
  height: 18px;
  border-radius: 2px;
  background: var(--vp-c-brand-1);
}

.outline-children {
  padding-left: 14px;
}

.level-three {
  font-size: 13px;
}

.level-four-list {
  padding-left: 12px;
}

.level-four {
  font-size: 12px;
  line-height: 28px;
}

.outline-children-enter-active,
.outline-children-leave-active {
  overflow: hidden;
  transition:
    opacity 200ms ease,
    transform 200ms ease;
}

.outline-children-enter-from,
.outline-children-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

@media (prefers-reduced-motion: reduce) {
  .outline-children-enter-active,
  .outline-children-leave-active {
    transition: none;
  }
}
</style>
