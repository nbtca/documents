<script setup lang="ts">
import { useData, useRoute } from 'vitepress'
import { computed, nextTick, onMounted, ref, watch } from 'vue'

interface Archive {
  date?: string
  source?: string
  author?: string
  format?: string
  redacted?: string
  note?: string
  transcriber?: string
  transcribed?: string
}

const route = useRoute()
const { frontmatter } = useData()

const meta = computed<Archive | null>(() => {
  if (!route.path.startsWith('/archived/'))
    return null
  const archive = frontmatter.value.archive as Archive | undefined
  if (!archive || (!archive.date && !archive.source))
    return null
  return archive
})

const rows = computed(() => {
  const m = meta.value
  if (!m)
    return []
  const out: Array<{ label: string, value: string }> = []
  // Left out, the transcriber is the only name here and reads as the author.
  out.push({ label: '原件撰写', value: m.author || '原件未署名' })
  if (m.source)
    out.push({ label: '出处', value: m.source })
  if (m.format)
    out.push({ label: '原件格式', value: m.format })
  if (m.redacted)
    out.push({ label: '已略去', value: m.redacted })
  if (m.note)
    out.push({ label: '处理', value: m.note })
  return out
})

const transcriber = computed(() => {
  const login = meta.value?.transcriber
  return login ? { login, date: meta.value?.transcribed } : null
})

// Only pages that actually carry a dead link need to say so.
const hasOutboundLink = ref(false)

function detectOutboundLink() {
  if (typeof document === 'undefined')
    return
  hasOutboundLink.value = !!document.querySelector('.vp-doc a[href^="http"]:not([href*="nbtca.space"])')
}

onMounted(detectOutboundLink)
watch(() => route.path, () => nextTick(detectOutboundLink))
</script>

<template>
  <aside v-if="meta" class="nb-archive-meta" aria-label="档案信息">
    <details>
      <summary>
        <span class="nb-archive-meta-tag">档案原件</span>
        <span v-if="meta.date" class="nb-archive-meta-date">{{ meta.date }}</span>
        <span class="nb-archive-meta-caret">›</span>
      </summary>
      <dl>
        <template v-for="row in rows" :key="row.label">
          <dt>{{ row.label }}</dt>
          <dd>{{ row.value }}</dd>
        </template>
        <template v-if="transcriber">
          <dt>本站转写</dt>
          <dd>
            <a :href="`https://github.com/${transcriber.login}`" target="_blank" rel="noreferrer">@{{ transcriber.login }}</a>
            <template v-if="transcriber.date">
              · {{ transcriber.date }}
            </template>
          </dd>
        </template>
      </dl>
      <p v-if="hasOutboundLink" class="nb-archive-meta-linknote">
        站外网址照原件保留，打不开是正常的。
      </p>
    </details>
  </aside>
</template>
